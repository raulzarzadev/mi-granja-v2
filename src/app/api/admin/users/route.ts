import { NextRequest, NextResponse } from 'next/server'
import { isUserAdmin } from '@/lib/userUtils'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    // Obtener el ID del usuario desde el token (esto debería venir del middleware de auth)
    // Por ahora usaremos un método simple
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    // Obtener el token y decodificarlo para obtener el ID del usuario
    // Por ahora simularemos que tenemos el userId desde el token
    // En producción, deberías decodificar el JWT aquí

    // Necesitamos una forma de verificar que el usuario actual es admin
    // Podemos usar el email desde las headers o desde el token decodificado
    const adminEmail = request.headers.get('x-user-email')

    if (
      !adminEmail ||
      !isUserAdmin({
        id: 'temp',
        email: adminEmail,
        roles: [],
        createdAt: new Date()
      })
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener todos los usuarios excepto el admin actual
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '!=', adminEmail)
    )

    const querySnapshot = await getDocs(usersQuery)
    const users = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isActive: true // Por ahora todos los usuarios están activos
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
