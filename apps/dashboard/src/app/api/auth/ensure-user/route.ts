import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'
import { assignUserRoles } from '@/lib/userUtils'
import { User } from '@/types'

const getBearerToken = (req: NextRequest) => {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim()
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Token de autenticación requerido' }, { status: 401 })
    }

    const decodedToken = await getAdminAuth().verifyIdToken(token)
    const uid = decodedToken.uid
    const email = decodedToken.email?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        { error: 'Tu cuenta de Google no tiene un correo válido.' },
        { status: 400 },
      )
    }

    const firestore = getAdminFirestore()
    const userRef = firestore.doc(`users/${uid}`)
    const snapshot = await userRef.get()
    const now = new Date()

    if (!snapshot.exists) {
      const user: User = {
        id: uid,
        email,
        name: decodedToken.name,
        roles: [],
        createdAt: now,
      }
      const userWithRoles = assignUserRoles(user)

      const userData = {
        email,
        name: decodedToken.name || null,
        roles: userWithRoles.roles,
        createdAt: now,
      }

      await userRef.set(userData)

      return NextResponse.json({
        ok: true,
        user: {
          id: uid,
          ...userData,
          createdAt: userData.createdAt.toISOString(),
        },
      })
    }

    const data = snapshot.data() || {}
    const createdAt =
      typeof data.createdAt?.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || now.toISOString()

    return NextResponse.json({
      ok: true,
      user: {
        id: uid,
        email: data.email || email,
        name: data.name || decodedToken.name || null,
        roles: data.roles || [],
        currentFarmId: data.currentFarmId || null,
        preferences: data.preferences || undefined,
        createdAt,
        subscriptionStatus: data.subscriptionStatus || null,
        planType: data.planType || null,
      },
    })
  } catch (error) {
    console.error('ensure-user error:', error)
    return NextResponse.json(
      { error: 'Error preparando tu cuenta de Google. Intenta de nuevo.' },
      { status: 500 },
    )
  }
}
