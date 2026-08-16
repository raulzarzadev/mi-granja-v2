export const AI_CONFIG_DOCUMENT = 'settings/ai'
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash'

export interface AiModelConfig {
  provider: 'openrouter'
  model: string
}

function validModelId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 160 &&
    /^[a-zA-Z0-9._~:/-]+$/.test(value)
  )
}

export function normalizeAiModelConfig(value: unknown): AiModelConfig {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const envModel = process.env.OPENROUTER_MODEL
  return {
    provider: 'openrouter',
    model: validModelId(stored.model)
      ? stored.model
      : validModelId(envModel)
        ? envModel
        : DEFAULT_OPENROUTER_MODEL,
  }
}

export function validateAiModelConfig(
  value: unknown,
): { config: AiModelConfig; error?: never } | { config?: never; error: string } {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  if (!validModelId(input.model)) {
    return { error: 'Selecciona un modelo válido de OpenRouter' }
  }
  return { config: { provider: 'openrouter', model: input.model } }
}

export async function getAiModelConfig(
  firestore: FirebaseFirestore.Firestore,
): Promise<AiModelConfig> {
  const snapshot = await firestore.doc(AI_CONFIG_DOCUMENT).get()
  return normalizeAiModelConfig(snapshot.data())
}
