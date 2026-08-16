import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { AiProvider } from './model-config'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12

export interface EncryptedAiCredential {
  algorithm: typeof ALGORITHM
  version: 1
  ciphertext: string
  iv: string
  authTag: string
  keyPreview: string
}

function readMasterKey(encodedKey = process.env.AI_CREDENTIALS_MASTER_KEY): Buffer {
  if (!encodedKey) {
    throw new Error('Falta AI_CREDENTIALS_MASTER_KEY en el servidor')
  }
  const key = Buffer.from(encodedKey, 'base64')
  if (
    key.length !== KEY_BYTES ||
    key.toString('base64').replace(/=+$/, '') !== encodedKey.replace(/=+$/, '')
  ) {
    throw new Error('AI_CREDENTIALS_MASTER_KEY debe contener exactamente 32 bytes en Base64')
  }
  return key
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  const prefix = trimmed.startsWith('sk-') ? 'sk-' : ''
  const suffix = trimmed.slice(-4)
  return `${prefix}••••••••${suffix}`
}

export function encryptAiCredential(
  apiKey: string,
  provider: AiProvider,
  encodedMasterKey?: string,
): EncryptedAiCredential {
  const plaintext = apiKey.trim()
  if (plaintext.length < 8 || plaintext.length > 500) {
    throw new Error('La API key debe contener entre 8 y 500 caracteres')
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, readMasterKey(encodedMasterKey), iv)
  cipher.setAAD(Buffer.from(`mi-granja:ai:${provider}:v1`, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  return {
    algorithm: ALGORITHM,
    version: 1,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyPreview: maskApiKey(plaintext),
  }
}

export function decryptAiCredential(
  encrypted: EncryptedAiCredential,
  provider: AiProvider,
  encodedMasterKey?: string,
): string {
  if (encrypted.algorithm !== ALGORITHM || encrypted.version !== 1) {
    throw new Error('Formato de credencial cifrada no compatible')
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    readMasterKey(encodedMasterKey),
    Buffer.from(encrypted.iv, 'base64'),
  )
  decipher.setAAD(Buffer.from(`mi-granja:ai:${provider}:v1`, 'utf8'))
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function isEncryptedAiCredential(value: unknown): value is EncryptedAiCredential {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.algorithm === ALGORITHM &&
    candidate.version === 1 &&
    typeof candidate.ciphertext === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.authTag === 'string' &&
    typeof candidate.keyPreview === 'string'
  )
}
