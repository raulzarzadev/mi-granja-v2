import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'
import { assignUserRoles } from '@/lib/userUtils'
import { User } from '@/types'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    const parsed = z
      .object({
        email: z.string().trim().toLowerCase().email().max(254),
        code: z
          .string()
          .trim()
          .regex(/^\d{6}$/),
      })
      .safeParse({ email, code })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email y código requeridos' }, { status: 400 })
    }

    const normalizedEmail = parsed.data.email
    const firestore = getAdminFirestore()
    const docRef = firestore.doc(`authCodes/${normalizedEmail}`)
    // Read, increment and consume in one transaction: a code can succeed only once.
    const verificationError = await firestore.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef)
      const data = snapshot.data()
      if (!data) return 'Código no encontrado. Solicita uno nuevo.'
      if (Date.now() > data.expiresAt) {
        tx.delete(docRef)
        return 'Código expirado. Solicita uno nuevo.'
      }
      if (data.attempts >= MAX_ATTEMPTS) {
        return 'Demasiados intentos. Solicita un código nuevo.'
      }
      if (data.code !== parsed.data.code) {
        const attempts = data.attempts + 1
        tx.update(docRef, { attempts })
        return attempts >= MAX_ATTEMPTS
          ? 'Demasiados intentos. Solicita un código nuevo.'
          : `Código incorrecto. ${MAX_ATTEMPTS - attempts} intentos restantes.`
      }
      tx.delete(docRef)
      return null
    })
    if (verificationError) return NextResponse.json({ error: verificationError }, { status: 400 })

    // Get or create Firebase user
    const adminAuth = getAdminAuth()
    let uid: string
    let isNewUser = false

    try {
      const existingUser = await adminAuth.getUserByEmail(normalizedEmail)
      uid = existingUser.uid
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
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
    return NextResponse.json(
      { error: 'Error verificando código. Intenta de nuevo.' },
      { status: 500 },
    )
  }
}
