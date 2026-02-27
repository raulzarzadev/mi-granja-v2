import { doc, getDoc } from 'firebase/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { isUserAdmin } from '@/lib/userUtils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const adminEmail = request.headers.get('x-user-email')

    if (
      !adminEmail ||
      !isUserAdmin({
        id: 'temp',
        email: adminEmail,
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

    // Obtener el usuario objetivo
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId))

    if (!targetUserDoc.exists()) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const targetUser = {
      id: targetUserDoc.id,
      ...targetUserDoc.data(),
    }

    // Generar token de suplantación (simplificado)
    // En producción, usarías JWT con información especial
    const impersonationToken = `impersonation_${Date.now()}_${targetUserId}`

    return NextResponse.json({
      user: targetUser,
      token: impersonationToken,
    })
  } catch (error) {
    console.error('Error al suplantar usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
