import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'
import { assignUserRoles } from '@/lib/userUtils'
import { User } from '@/types'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email y código requeridos' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const firestore = getAdminFirestore()
    const docRef = firestore.doc(`authCodes/${normalizedEmail}`)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: 'Código no encontrado. Solicita uno nuevo.' },
        { status: 400 },
      )
    }

    const data = snapshot.data()!

    // Check expiration
    if (Date.now() > data.expiresAt) {
      await docRef.delete()
      return NextResponse.json({ error: 'Código expirado. Solicita uno nuevo.' }, { status: 400 })
    }

    // Check max attempts
    if (data.attempts >= MAX_ATTEMPTS) {
      await docRef.delete()
      return NextResponse.json(
        { error: 'Demasiados intentos. Solicita un código nuevo.' },
        { status: 400 },
      )
    }

    // Increment attempts
    await docRef.update({ attempts: data.attempts + 1 })

    // Verify code
    if (data.code !== code.trim()) {
      const remaining = MAX_ATTEMPTS - data.attempts - 1
      return NextResponse.json(
        {
          error: `Código incorrecto. ${remaining > 0 ? `${remaining} intentos restantes.` : 'Solicita un código nuevo.'}`,
        },
        { status: 400 },
      )
    }

    // Code is valid — delete it
    await docRef.delete()

    // Get or create Firebase user
    const adminAuth = getAdminAuth()
    let uid: string
    let isNewUser = false

    try {
      const existingUser = await adminAuth.getUserByEmail(normalizedEmail)
      uid = existingUser.uid
    } catch {
      // User doesn't exist, create one
      const newUser = await adminAuth.createUser({ email: normalizedEmail })
      uid = newUser.uid
      isNewUser = true
    }

    // If new user, create Firestore document with roles
    if (isNewUser) {
      const user: User = {
        id: uid,
        email: normalizedEmail,
        roles: [],
        createdAt: new Date(),
      }
      const userWithRoles = assignUserRoles(user)

      await firestore.doc(`users/${uid}`).set({
        email: normalizedEmail,
        roles: userWithRoles.roles,
        createdAt: new Date(),
      })
    }

    // Create custom token for client-side sign-in
    const customToken = await adminAuth.createCustomToken(uid)

    return NextResponse.json({ token: customToken, isNewUser })
  } catch (error) {
    console.error('verify-code error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
