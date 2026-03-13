import { type App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let adminApp: App | null = null

function isEmulatorMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' || !!process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
}

/** Extrae el projectId de NEXT_PUBLIC_FIREBASE_CONFIG si existe */
function getProjectId(): string {
  try {
    const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
    if (config) return JSON.parse(config).projectId
  } catch {}
  return 'mi-granja-dev'
}

// Setear variables de emulador lo antes posible (antes de que cualquier SDK las lea)
if (isEmulatorMode()) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099'
  process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080'
}

function getAdminApp(): App {
  if (adminApp) return adminApp

  if (getApps().length > 0) {
    adminApp = getApp()
    return adminApp
  }

  if (isEmulatorMode()) {
    const projectId = getProjectId()
    console.log(`🔧 Firebase Admin conectando a emuladores (project: ${projectId})`)
    adminApp = initializeApp({ projectId })
  } else {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (serviceAccount) {
      const parsed = JSON.parse(serviceAccount)
      // Vercel puede escapar doble los \n del private_key — restaurar saltos de línea reales
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
      }
      adminApp = initializeApp({
        credential: cert(parsed),
      })
    } else {
      adminApp = initializeApp()
    }
  }

  return adminApp
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}
