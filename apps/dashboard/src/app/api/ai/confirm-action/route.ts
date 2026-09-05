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
    const parsedAction = aiActionSchema.safeParse(body.action)
    if (!parsedAction.success)
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    const action = parsedAction.data
    if (!farmId) return NextResponse.json({ error: 'Granja requerida' }, { status: 400 })
    if (!actionId) return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })

    const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
    if (!access) return forbidden()

    const firestore = getAdminFirestore()
    const logRef = firestore.collection('aiActionLogs').doc(actionId)
    const claim = await firestore.runTransaction(async (tx) => {
      const logSnap = await tx.get(logRef)
      if (!logSnap.exists) return { status: 404, error: 'Acción no encontrada' }
      const log = logSnap.data()!
      if (log.userId !== auth.uid || log.farmId !== farmId) {
        return { status: 409, error: 'Acción no válida' }
      }
      if (log.status === 'confirmed') return { status: 200, result: log.result }
      if (log.status !== 'proposed') {
        return {
          status: 409,
          error:
            'Esta acción ya está en proceso. Revisa los registros antes de intentar otra acción.',
        }
      }
      // Never release this claim automatically: execution may partially succeed before failing.
      tx.update(logRef, { status: 'processing', finalPayload: action, startedAt: Timestamp.now() })
      return { status: 201 }
    })
    if (claim.status === 200) return NextResponse.json({ ok: true, result: claim.result })
    if (claim.status !== 201)
      return NextResponse.json({ error: claim.error }, { status: claim.status })

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
