import { NextRequest, NextResponse } from 'next/server'
import { chatHistoryCollection } from '@/lib/ai/chat-history'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth
    const profile = await getAdminFirestore().doc(`users/${auth.uid}`).get()
    if (!isAuthenticatedUserAdmin(auth.email, profile.data()?.roles)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    const userId = request.nextUrl.searchParams.get('userId') || ''
    const cursor = request.nextUrl.searchParams.get('cursor')
    const validId = (value: string) =>
      value.length <= 128 && !/[/]/.test(value) && value !== '.' && value !== '..'
    if (!userId || !validId(userId) || (cursor !== null && (!cursor || !validId(cursor)))) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }
    const collection = chatHistoryCollection(userId)
    let query = collection.orderBy('createdAt', 'desc').limit(26)
    if (cursor) {
      const snapshot = await collection.doc(cursor).get()
      if (!snapshot.exists) return NextResponse.json({ error: 'Página inválida' }, { status: 400 })
      query = query.startAfter(snapshot)
    }
    const snapshot = await query.get()
    const page = snapshot.docs.slice(0, 25)
    return NextResponse.json(
      {
        items: page.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            question: data.question,
            answer: data.answer ?? null,
            status: data.status,
            farmId: data.farmId,
            farmName: data.farmName,
            conversationId: data.conversationId,
            createdAt: data.createdAt.toDate().toISOString(),
            provider: data.provider ?? null,
            model: data.model ?? null,
            tokens: data.tokens ?? null,
          }
        }),
        nextCursor: snapshot.docs.length > 25 ? page.at(-1)?.id : null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('Error cargando historial de IA:', error)
    return NextResponse.json({ error: 'No se pudo cargar el historial de IA' }, { status: 500 })
  }
}
