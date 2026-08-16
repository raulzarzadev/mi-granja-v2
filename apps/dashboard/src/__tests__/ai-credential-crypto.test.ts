jest.mock('server-only', () => ({}))

import { decryptAiCredential, encryptAiCredential, maskApiKey } from '@/lib/ai/credential-crypto'

const MASTER_KEY = Buffer.alloc(32, 7).toString('base64')

describe('AI credential encryption', () => {
  it('encrypts with AES-256-GCM and decrypts only for the same provider', () => {
    const plaintext = 'sk-project-secret-1234567890'
    const encrypted = encryptAiCredential(plaintext, 'openai', MASTER_KEY)

    expect(encrypted.algorithm).toBe('aes-256-gcm')
    expect(encrypted.ciphertext).not.toContain(plaintext)
    expect(decryptAiCredential(encrypted, 'openai', MASTER_KEY)).toBe(plaintext)
    expect(() => decryptAiCredential(encrypted, 'kimi', MASTER_KEY)).toThrow()
  })

  it('detects modified ciphertext', () => {
    const encrypted = encryptAiCredential('sk-project-secret-1234567890', 'openai', MASTER_KEY)
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }
    expect(() => decryptAiCredential(tampered, 'openai', MASTER_KEY)).toThrow()
  })

  it('returns a safe preview without exposing the complete key', () => {
    const preview = maskApiKey('sk-project-secret-1234567890')
    expect(preview).toContain('••••••••')
    expect(preview.endsWith('7890')).toBe(true)
    expect(preview).not.toContain('secret')
  })

  it('requires a 32-byte Base64 master key', () => {
    expect(() => encryptAiCredential('sk-project-secret', 'openai', 'too-short')).toThrow(
      'AI_CREDENTIALS_MASTER_KEY debe contener exactamente 32 bytes en Base64',
    )
  })
})
