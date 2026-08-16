import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG_DOCUMENT, getAiModelConfig, validateAiModelConfig } from '@/lib/ai/model-config'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface OpenRouterModelResponse {
  id?: unknown
  name?: unknown
  context_length?: unknown
  pricing?: { prompt?: unknown; completion?: unknown }
  supported_parameters?: unknown
}

async function getAdminContext(request: NextRequest) {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return { error: auth }

  const firestore = getAdminFirestore()
  const userDoc = await firestore.doc(`users/${auth.uid}`).get()
  if (!isAuthenticatedUserAdmin(auth.email, userDoc.data()?.roles)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { auth, firestore }
}

async function readOpenRouterStatus() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { configured: false, operational: false, error: 'Falta OPENROUTER_API_KEY' }
  }

  try {
    const [creditsResponse, modelsResponse] = await Promise.all([
      fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }),
      fetch('https://openrouter.ai/api/v1/models', {
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }),
    ])

    const creditsPayload = await creditsResponse.json().catch(() => ({}))
    const modelsPayload = await modelsResponse.json().catch(() => ({}))
    if (!creditsResponse.ok) {
      return {
        configured: true,
        operational: false,
        error: creditsPayload?.error?.message || `OpenRouter respondió ${creditsResponse.status}`,
        models: [],
      }
    }

    const totalCredits = Number(creditsPayload?.data?.total_credits || 0)
    const totalUsage = Number(creditsPayload?.data?.total_usage || 0)
    const models = Array.isArray(modelsPayload?.data)
      ? (modelsPayload.data as OpenRouterModelResponse[])
          .filter((model) => {
            const parameters = Array.isArray(model.supported_parameters)
              ? model.supported_parameters
              : []
            return (
              typeof model.id === 'string' &&
              parameters.includes('response_format') &&
              parameters.includes('structured_outputs')
            )
          })
          .map((model) => ({
            id: model.id as string,
            name: typeof model.name === 'string' ? model.name : (model.id as string),
            contextLength: typeof model.context_length === 'number' ? model.context_length : null,
            promptPerMillion: Number(model.pricing?.prompt || 0) * 1_000_000,
            completionPerMillion: Number(model.pricing?.completion || 0) * 1_000_000,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : []

    return {
      configured: true,
      operational: true,
      totalCredits,
      totalUsage,
      remainingCredits: totalCredits - totalUsage,
      hasCredit: totalCredits - totalUsage > 0,
      models,
    }
  } catch (error) {
    return {
      configured: true,
      operational: false,
      error: error instanceof Error ? error.message : 'No se pudo consultar OpenRouter',
      models: [],
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const [config, openRouter] = await Promise.all([
      getAiModelConfig(context.firestore),
      readOpenRouterStatus(),
    ])
    return NextResponse.json({ config, openRouter })
  } catch (error) {
    console.error('Error cargando configuracion de IA:', error)
    return NextResponse.json({ error: 'No se pudo cargar la configuracion de IA' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const body = await request.json()
    const validated = validateAiModelConfig(body)
    if (!validated.config) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const providerStatus = await readOpenRouterStatus()
    const availableModels = 'models' in providerStatus ? providerStatus.models : []
    if (
      Array.isArray(availableModels) &&
      availableModels.length > 0 &&
      !availableModels.some((model) => model.id === validated.config.model)
    ) {
      return NextResponse.json(
        { error: 'El modelo seleccionado no está disponible o no admite respuestas estructuradas' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    await context.firestore.doc(AI_CONFIG_DOCUMENT).set(
      {
        ...validated.config,
        updatedAt: now,
        updatedBy: context.auth.uid,
        updatedByEmail: context.auth.email,
      },
      { merge: true },
    )
    return NextResponse.json({ config: validated.config, updatedAt: now })
  } catch (error) {
    console.error('Error guardando configuracion de IA:', error)
    return NextResponse.json(
      { error: 'No se pudo guardar la configuracion de IA' },
      { status: 500 },
    )
  }
}
