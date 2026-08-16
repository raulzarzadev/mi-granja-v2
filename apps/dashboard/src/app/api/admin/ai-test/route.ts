import { NextRequest, NextResponse } from 'next/server'
import { buildAiContext } from '@/lib/ai/actions'
import { AiProviderChainError, callAiProvider } from '@/lib/ai/openrouter'
import { AI_DAILY_LIMIT } from '@/lib/ai/server'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

interface TestHistoryItem {
  role: 'user' | 'assistant'
  text: string
}

function normalizeHistory(value: unknown): TestHistoryItem[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(-10)
    .filter(
      (item): item is TestHistoryItem =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as TestHistoryItem).role === 'user' ||
          (item as TestHistoryItem).role === 'assistant') &&
        typeof (item as TestHistoryItem).text === 'string',
    )
    .map((item) => ({ ...item, text: item.text.slice(0, 2_000) }))
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const firestore = getAdminFirestore()
    const userDoc = await firestore.doc(`users/${auth.uid}`).get()
    if (!isAuthenticatedUserAdmin(auth.email, userDoc.data()?.roles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const farmId = typeof body.farmId === 'string' ? body.farmId.trim() : ''
    if (!message || message.length > 2_000) {
      return NextResponse.json(
        { error: 'Escribe un mensaje de entre 1 y 2,000 caracteres' },
        { status: 400 },
      )
    }
    if (!farmId) {
      return NextResponse.json({ error: 'Selecciona una granja para la prueba' }, { status: 400 })
    }

    const farmSnapshot = await firestore.doc(`farms/${farmId}`).get()
    if (!farmSnapshot.exists) {
      return NextResponse.json({ error: 'La granja seleccionada no existe' }, { status: 404 })
    }
    const farm = farmSnapshot.data()
    const context = await buildAiContext(farmId, message, {
      animals: true,
      reminders: true,
      breeding: true,
    })

    const result = await callAiProvider({
      message,
      farmName:
        (typeof farm?.name === 'string' && farm.name) ||
        (typeof farm?.farmName === 'string' && farm.farmName) ||
        'Granja de prueba',
      context,
      history: normalizeHistory(body.history),
      diagnostics: true,
    })

    return NextResponse.json({
      message: result.parsed.message,
      provider: result.provider,
      model: result.model,
      usage: result.usage ?? null,
      attempts: result.attempts ?? [],
      clientDailyLimit: AI_DAILY_LIMIT,
    })
  } catch (error) {
    console.error('Error probando proveedor de IA:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'El proveedor no pudo completar la prueba',
        attempts: error instanceof AiProviderChainError ? error.attempts : [],
        clientDailyLimit: AI_DAILY_LIMIT,
      },
      { status: 502 },
    )
  }
}
