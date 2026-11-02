import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  AiProposalError,
  cancelAiProposal,
  confirmAiProposal,
  getAiProposal,
  listConversationProposals,
  reviseAiProposal,
} from '@/lib/ai/proposals'
import { forbidden, requireAiAuth, resolveFarmPermissions } from '@/lib/ai/server'

/** Only server-persisted versioned proposals can be confirmed. Legacy aiActionLogs are audit-only. */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAiAuth(request)
    if (auth instanceof NextResponse) return auth
    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
      body = parsed
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
    }
    if (body.actionId || (!body.operation && body.action))
      return NextResponse.json(
        {
          error:
            'El ejecutor anterior fue retirado. Prepara una nueva propuesta desde el asistente.',
        },
        { status: 410 },
      )
    const farmId = typeof body.farmId === 'string' ? body.farmId.trim() : ''
    if (body.operation === 'list') {
      const conversationId =
        typeof body.conversationId === 'string' ? body.conversationId.trim() : ''
      if (
        !farmId ||
        farmId.includes('/') ||
        !conversationId ||
        conversationId.length > 200 ||
        body.action !== undefined
      )
        return NextResponse.json({ error: 'Conversación inválida.' }, { status: 400 })
      const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
      if (!access) return forbidden()
      const proposals = await listConversationProposals({
        farmId,
        userId: auth.uid,
        permissions: access.permissions,
        conversationId,
      })
      return NextResponse.json({ proposals })
    }
    const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : ''
    const operation = body.operation
    if (
      !farmId ||
      !proposalId ||
      proposalId.includes('/') ||
      typeof operation !== 'string' ||
      !['get', 'revise', 'confirm', 'cancel'].includes(operation)
    )
      return NextResponse.json({ error: 'Solicitud de propuesta inválida.' }, { status: 400 })
    if (
      operation !== 'get' &&
      (typeof body.revision !== 'number' || !Number.isInteger(body.revision) || body.revision < 1)
    )
      return NextResponse.json({ error: 'Revisión de propuesta requerida.' }, { status: 400 })
    if (operation !== 'revise' && body.action !== undefined)
      return NextResponse.json(
        {
          error:
            'La confirmación solo acepta el identificador y la revisión de la propuesta guardada.',
        },
        { status: 400 },
      )
    const access = await resolveFarmPermissions({ farmId, userId: auth.uid, email: auth.email })
    if (!access) return forbidden()
    const params = {
      farmId,
      userId: auth.uid,
      permissions: access.permissions,
      proposalId,
      revision: body.revision as number,
    }
    const proposal =
      operation === 'get'
        ? await getAiProposal(params)
        : operation === 'revise'
          ? await reviseAiProposal({ ...params, action: body.action })
          : operation === 'cancel'
            ? await cancelAiProposal(params)
            : await confirmAiProposal(params)
    return NextResponse.json({ proposal })
  } catch (error) {
    if (error instanceof AiProposalError)
      return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: 'Revisa los campos del movimiento antes de guardar.' },
        { status: 400 },
      )
    console.error('AI proposal operation failed', error)
    return NextResponse.json(
      {
        error:
          'No se pudo completar la operación. Vuelve a consultar la propuesta para comprobar su estado.',
      },
      { status: 500 },
    )
  }
}
