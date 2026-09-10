import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  : '{}'

// Inicializar Firebase (evitar re-init en HMR)
const isNewApp = getApps().length === 0
const app = isNewApp ? initializeApp(firebaseConfig) : getApp()

const useEmulator =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_EMULATOR === 'true'

// Inicializar Firebase Auth y obtener una referencia al servicio
export const auth = getAuth(app)

// Inicializar Cloud Firestore con persistencia offline (IndexedDB, multi-tab)
// initializeFirestore solo se puede llamar una vez; en HMR usamos getFirestore
export const db = isNewApp
  ? initializeFirestore(app, {
      // El emulador local puede saturar WebChannel con HMR y listeners persistentes.
      experimentalForceLongPolling: useEmulator,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app)

// Inicializar Cloud Storage y obtener una referencia al servicio
export const storage = getStorage(app)

// Conectar a emuladores en desarrollo
if (useEmulator) {
  console.log('🔧 Conectando a Firebase Emulators...')
  try {
    const emulatorHost = '127.0.0.1'
    connectAuthEmulator(auth, `http://${emulatorHost}:9299`, { disableWarnings: false })
    connectFirestoreEmulator(db, emulatorHost, 8180)
    connectStorageEmulator(storage, emulatorHost, 9399)
    console.log('✅ Firebase Emulators conectados')
  } catch (_e) {
    // Emuladores ya conectados (HMR)
  }
}

export default app
