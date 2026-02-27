import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  : '{}'

// Inicializar Firebase (evitar re-init en HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Inicializar Firebase Auth y obtener una referencia al servicio
export const auth = getAuth(app)

// Inicializar Cloud Firestore y obtener una referencia al servicio
export const db = getFirestore(app)

// Inicializar Cloud Storage y obtener una referencia al servicio
export const storage = getStorage(app)

// Conectar a emuladores en desarrollo
if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
  } catch (_e) {
    // Emuladores ya conectados (HMR)
  }
}

export default app
