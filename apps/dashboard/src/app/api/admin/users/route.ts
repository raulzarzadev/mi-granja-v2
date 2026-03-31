import { NextRequest, NextResponse } from 'next/server'
import { verifyBillingAuth, isAuthError } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { isUserAdmin } from '@/lib/userUtils'

export async function GET(request: NextRequest) {
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

    // Obtener todos los usuarios excepto el admin actual usando Admin SDK
    const firestore = getAdminFirestore()
    const usersSnap = await firestore
      .collection('users')
      .where('email', '!=', auth.email)
      .get()

    const users = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isActive: true,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
