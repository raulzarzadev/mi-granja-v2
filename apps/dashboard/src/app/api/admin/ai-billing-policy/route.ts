import { NextRequest, NextResponse } from 'next/server'
import {
  AI_BILLING_POLICY_DOCUMENT,
  aiBillingPolicySchema,
  getAiBillingPolicy,
} from '@/lib/ai/billing-policy'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

async function authorize(request: NextRequest) {
  const auth = await verifyBillingAuth(request)
  if (isAuthError(auth)) return auth
  const user = await getAdminFirestore().doc(`users/${auth.uid}`).get()
  return isAuthenticatedUserAdmin(auth.email, user.data()?.roles)
    ? auth
    : NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}
export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request)
    if (auth instanceof Response) return auth
    return NextResponse.json({ policy: await getAiBillingPolicy() })
  } catch (error) {
    console.error('Error leyendo política IA', error)
    return NextResponse.json({ error: 'No se pudo cargar la política de IA.' }, { status: 500 })
  }
}
export async function PUT(request: NextRequest) {
  try {
    const auth = await authorize(request)
    if (auth instanceof Response) return auth
    const body = await request.json().catch(() => null),
      parsed = aiBillingPolicySchema.safeParse(body?.policy)
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Revisa el plan y los importes de la política de IA.' },
        { status: 400 },
      )
    await getAdminFirestore()
      .doc(AI_BILLING_POLICY_DOCUMENT)
      .set({ policy: parsed.data, updatedBy: auth.uid, updatedAt: new Date().toISOString() })
    return NextResponse.json({ policy: parsed.data })
  } catch (error) {
    console.error('Error guardando política IA', error)
    return NextResponse.json({ error: 'No se pudo guardar la política de IA.' }, { status: 500 })
  }
}
