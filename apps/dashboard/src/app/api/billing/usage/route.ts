import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, resolveEffectiveUid, verifyBillingAuth } from '@/lib/billing-auth'
import { buildBillingUsage } from '@/lib/billing-usage'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    const uid = resolveEffectiveUid(auth, request)
    const firestore = getAdminFirestore()

    return NextResponse.json(await buildBillingUsage(firestore, uid))
  } catch (error) {
    console.error('Error obteniendo uso:', error)
    return NextResponse.json({ error: 'Error al obtener datos de uso' }, { status: 500 })
  }
}
