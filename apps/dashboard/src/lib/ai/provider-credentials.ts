import 'server-only'
import type { Firestore } from 'firebase-admin/firestore'
import {
  decryptAiCredential,
  type EncryptedAiCredential,
  isEncryptedAiCredential,
} from './credential-crypto'
import { type AiProvider, aiCredentialDocument } from './model-config'

const ENV_KEYS: Record<AiProvider, string> = {
  openai: 'OPENAI_API_KEY',
  kimi: 'KIMI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
}

export interface AiCredentialMetadata {
  configured: boolean
  keyPreview?: string
  source?: 'firestore' | 'environment'
  updatedAt?: string
  updatedByEmail?: string | null
}

export async function getAiCredentialMetadata(
  firestore: Firestore,
  provider: AiProvider,
): Promise<AiCredentialMetadata> {
  const snapshot = await firestore.doc(aiCredentialDocument(provider)).get()
  const data = snapshot.data()
  if (isEncryptedAiCredential(data)) {
    const stored = data as EncryptedAiCredential & {
      updatedAt?: unknown
      updatedByEmail?: unknown
    }
    return {
      configured: true,
      keyPreview: stored.keyPreview,
      source: 'firestore',
      updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : undefined,
      updatedByEmail: typeof stored.updatedByEmail === 'string' ? stored.updatedByEmail : null,
    }
  }
  if (process.env[ENV_KEYS[provider]]) {
    return { configured: true, keyPreview: 'Configurada en el servidor', source: 'environment' }
  }
  return { configured: false }
}

export async function resolveAiApiKey(
  firestore: Firestore,
  provider: AiProvider,
): Promise<string | null> {
  const snapshot = await firestore.doc(aiCredentialDocument(provider)).get()
  const data = snapshot.data()
  if (isEncryptedAiCredential(data)) {
    return decryptAiCredential(data as EncryptedAiCredential, provider)
  }
  return process.env[ENV_KEYS[provider]]?.trim() || null
}
