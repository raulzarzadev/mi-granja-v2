import { Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { executeAiAction } from '@/lib/ai/actions'
import { forbidden, requireAiAuth, resolveFarmPermissions } from '@/lib/ai/server'
import { aiActionSchema } from '@/lib/ai/types'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAiAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const farmId = String(body.farmId || '').trim()
    const actionId = String(body.actionId || '').trim()
    const action = aiActionSchema.parse(body.action)
    if (!farmId) return NextResponse.json({ error: 'Granja requerida' }, { status: 400 })
    if (!actionId) return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })

    const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
    if (!access) return forbidden()

    const firestore = getAdminFirestore()
    const logRef = firestore.collection('aiActionLogs').doc(actionId)
    const logSnap = await logRef.get()
    if (!logSnap.exists)
      return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 })
    const log = logSnap.data()!
    if (log.userId !== auth.uid || log.farmId !== farmId || log.status !== 'proposed') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 409 })
    }

    const result = await executeAiAction({
      action,
      userId: auth.uid,
      farmId,
      permissions: access.permissions,
    })

    await logRef.set(
      {
        status: 'confirmed',
        finalPayload: action,
        result,
        confirmedAt: Timestamp.now(),
      },
      { merge: true },
    )

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('AI confirm error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error confirmando acción' },
      { status: 500 },
    )
  }
}
