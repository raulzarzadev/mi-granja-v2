import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  : '{}'

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar Firebase Auth y obtener una referencia al servicio
export const auth = getAuth(app)

// Inicializar Cloud Firestore y obtener una referencia al servicio
export const db = getFirestore(app)

export default app
