import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyBillingAuth, isAuthError } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { isUserAdmin } from '@/lib/userUtils'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBillingAuth(request)
    if (isAuthError(auth)) return auth

    // Verificar que el usuario autenticado es admin usando su email verificado del token
    if (
      !isUserAdmin({
        id: auth.uid,
        email: auth.email,
        roles: [],
        createdAt: new Date(),
      })
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Obtener el usuario objetivo usando Admin SDK
    const firestore = getAdminFirestore()
    const targetUserDoc = await firestore.doc(`users/${targetUserId}`).get()

    if (!targetUserDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const targetUser = {
      id: targetUserDoc.id,
      ...targetUserDoc.data(),
    }

    // Generar token de suplantación criptográficamente seguro
    const impersonationToken = crypto.randomUUID()

    return NextResponse.json({
      user: targetUser,
      token: impersonationToken,
    })
  } catch (error) {
    console.error('Error al suplantar usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
