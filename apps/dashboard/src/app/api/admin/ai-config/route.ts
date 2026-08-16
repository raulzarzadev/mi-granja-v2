import { NextRequest, NextResponse } from 'next/server'
import { encryptAiCredential } from '@/lib/ai/credential-crypto'
import {
  AI_CONFIG_DOCUMENT,
  AI_PROVIDERS,
  type AiProvider,
  aiCredentialDocument,
  getAiModelConfig,
  isAiProvider,
  validateAiModelConfig,
} from '@/lib/ai/model-config'
import { getAiCredentialMetadata, resolveAiApiKey } from '@/lib/ai/provider-credentials'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface ProviderModelResponse {
  id?: unknown
  name?: unknown
  context_length?: unknown
  pricing?: { prompt?: unknown; completion?: unknown }
  supported_parameters?: unknown
}

const PROVIDER_MODELS_ENDPOINT: Record<AiProvider, string> = {
  openai: 'https://api.openai.com/v1/models',
  kimi: 'https://api.moonshot.ai/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
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

async function readProviderStatus(firestore: FirebaseFirestore.Firestore, provider: AiProvider) {
  const metadata = await getAiCredentialMetadata(firestore, provider)
  if (!metadata.configured) return { ...metadata, operational: false }

  try {
    const apiKey = await resolveAiApiKey(firestore, provider)
    if (!apiKey) return { ...metadata, operational: false, error: 'No se pudo leer la API key' }

    if (provider === 'openrouter') return readOpenRouterStatus(apiKey, metadata)
    const response = await fetch(PROVIDER_MODELS_ENDPOINT[provider], {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        ...metadata,
        operational: false,
        error: payload?.error?.message || `${provider} respondió ${response.status}`,
      }
    }
    const models = Array.isArray(payload?.data)
      ? (payload.data as ProviderModelResponse[])
          .filter((model) => typeof model.id === 'string')
          .map((model) => ({
            id: model.id as string,
            name: typeof model.name === 'string' ? model.name : (model.id as string),
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
    if (provider === 'kimi') {
      const balanceResponse = await fetch('https://api.moonshot.ai/v1/users/me/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      const balancePayload = await balanceResponse.json().catch(() => ({}))
      const availableBalance = Number(balancePayload?.data?.available_balance)
      if (balanceResponse.ok && Number.isFinite(availableBalance)) {
        return {
          ...metadata,
          operational: availableBalance > 0,
          hasCredit: availableBalance > 0,
          availableBalance,
          models,
        }
      }
      return {
        ...metadata,
        operational: true,
        hasCredit: null,
        balanceError:
          balancePayload?.error?.message ||
          balancePayload?.message ||
          `No se pudo consultar el saldo (${balanceResponse.status})`,
        models,
      }
    }
    return {
      ...metadata,
      operational: true,
      hasCredit: null,
      balanceError: 'OpenAI no permite consultar el saldo con una API key de proyecto',
      models,
    }
  } catch (error) {
    return {
      ...metadata,
      operational: false,
      error: error instanceof Error ? error.message : `No se pudo consultar ${provider}`,
    }
  }
}

async function readOpenRouterStatus(
  apiKey: string,
  metadata: Awaited<ReturnType<typeof getAiCredentialMetadata>>,
) {
  const [creditsResponse, modelsResponse] = await Promise.all([
    fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    }),
    fetch(PROVIDER_MODELS_ENDPOINT.openrouter, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    }),
  ])
  const creditsPayload = await creditsResponse.json().catch(() => ({}))
  const modelsPayload = await modelsResponse.json().catch(() => ({}))
  if (!creditsResponse.ok) {
    return {
      ...metadata,
      operational: false,
      error: creditsPayload?.error?.message || `OpenRouter respondió ${creditsResponse.status}`,
      models: [],
    }
  }
  const totalCredits = Number(creditsPayload?.data?.total_credits || 0)
  const totalUsage = Number(creditsPayload?.data?.total_usage || 0)
  const models = Array.isArray(modelsPayload?.data)
    ? (modelsPayload.data as ProviderModelResponse[])
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
    ...metadata,
    operational: true,
    totalCredits,
    totalUsage,
    remainingCredits: totalCredits - totalUsage,
    hasCredit: totalCredits - totalUsage > 0,
    models,
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const [config, statusEntries] = await Promise.all([
      getAiModelConfig(context.firestore),
      Promise.all(
        AI_PROVIDERS.map(
          async (provider) =>
            [provider, await readProviderStatus(context.firestore, provider)] as const,
        ),
      ),
    ])
    return NextResponse.json({ config, providers: Object.fromEntries(statusEntries) })
  } catch (error) {
    console.error('Error cargando configuracion de IA:', error)
    return NextResponse.json({ error: 'No se pudo cargar la configuracion de IA' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAdminContext(request)
    if ('error' in context) return context.error

    const body = (await request.json()) as Record<string, unknown>
    const validated = validateAiModelConfig(body)
    if (!validated.config) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const rawApiKeys =
      body.apiKeys && typeof body.apiKeys === 'object'
        ? (body.apiKeys as Record<string, unknown>)
        : {}
    const removeApiKeys = Array.isArray(body.removeApiKeys)
      ? body.removeApiKeys.filter(isAiProvider)
      : []
    const encryptedKeys = new Map<AiProvider, ReturnType<typeof encryptAiCredential>>()
    for (const provider of AI_PROVIDERS) {
      const apiKey = rawApiKeys[provider]
      if (typeof apiKey === 'string' && apiKey.trim()) {
        encryptedKeys.set(provider, encryptAiCredential(apiKey, provider))
      }
    }

    const now = new Date().toISOString()
    const batch = context.firestore.batch()
    batch.set(
      context.firestore.doc(AI_CONFIG_DOCUMENT),
      {
        ...validated.config,
        updatedAt: now,
        updatedBy: context.auth.uid,
        updatedByEmail: context.auth.email,
      },
      { merge: true },
    )
    for (const [provider, encrypted] of encryptedKeys) {
      batch.set(context.firestore.doc(aiCredentialDocument(provider)), {
        ...encrypted,
        updatedAt: now,
        updatedBy: context.auth.uid,
        updatedByEmail: context.auth.email,
      })
    }
    for (const provider of removeApiKeys) {
      if (!encryptedKeys.has(provider)) {
        batch.delete(context.firestore.doc(aiCredentialDocument(provider)))
      }
    }
    await batch.commit()

    const metadataEntries = await Promise.all(
      AI_PROVIDERS.map(
        async (provider) =>
          [provider, await getAiCredentialMetadata(context.firestore, provider)] as const,
      ),
    )
    return NextResponse.json({
      config: validated.config,
      credentials: Object.fromEntries(metadataEntries),
      updatedAt: now,
    })
  } catch (error) {
    console.error('Error guardando configuracion de IA:', error)
    const message =
      error instanceof Error && error.message.startsWith('AI_CREDENTIALS_MASTER_KEY')
        ? error.message
        : error instanceof Error && error.message.startsWith('Falta AI_CREDENTIALS_MASTER_KEY')
          ? error.message
          : 'No se pudo guardar la configuracion de IA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
