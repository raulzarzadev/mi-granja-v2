export const AI_CONFIG_DOCUMENT = 'settings/ai'
export const AI_CREDENTIALS_COLLECTION = `${AI_CONFIG_DOCUMENT}/credentials`
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash'

export const AI_PROVIDERS = ['openai', 'kimi', 'openrouter'] as const
export type AiProvider = (typeof AI_PROVIDERS)[number]

export const DEFAULT_AI_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-5-mini',
  kimi: 'kimi-k2.6',
  openrouter: DEFAULT_OPENROUTER_MODEL,
}

export interface AiProviderConfig {
  enabled: boolean
  model: string
}

export interface AiModelConfig {
  primaryProvider: AiProvider
  fallbackProviders: AiProvider[]
  providers: Record<AiProvider, AiProviderConfig>
}

export function aiCredentialDocument(provider: AiProvider) {
  return `${AI_CREDENTIALS_COLLECTION}/${provider}`
}

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && AI_PROVIDERS.includes(value as AiProvider)
}

export function isValidAiModelId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 160 &&
    /^[a-zA-Z0-9._~:/-]+$/.test(value)
  )
}

function normalizeProviderConfig(
  provider: AiProvider,
  value: unknown,
  legacyModel?: unknown,
): AiProviderConfig {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const envModel = provider === 'openrouter' ? process.env.OPENROUTER_MODEL : undefined
  const model = isValidAiModelId(stored.model)
    ? stored.model
    : isValidAiModelId(legacyModel)
      ? legacyModel
      : isValidAiModelId(envModel)
        ? envModel
        : DEFAULT_AI_MODELS[provider]

  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : provider === 'openrouter',
    model,
  }
}

export function normalizeAiModelConfig(value: unknown): AiModelConfig {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const storedProviders =
    stored.providers && typeof stored.providers === 'object'
      ? (stored.providers as Record<string, unknown>)
      : {}
  const legacyProvider = isAiProvider(stored.provider) ? stored.provider : 'openrouter'
  const primaryProvider = isAiProvider(stored.primaryProvider)
    ? stored.primaryProvider
    : legacyProvider
  const fallbackProviders = Array.isArray(stored.fallbackProviders)
    ? stored.fallbackProviders.filter(
        (provider, index, values): provider is AiProvider =>
          isAiProvider(provider) &&
          provider !== primaryProvider &&
          values.indexOf(provider) === index,
      )
    : AI_PROVIDERS.filter((provider) => provider !== primaryProvider)

  const providers: Record<AiProvider, AiProviderConfig> = {
    openai: normalizeProviderConfig('openai', storedProviders.openai),
    kimi: normalizeProviderConfig('kimi', storedProviders.kimi),
    openrouter: normalizeProviderConfig(
      'openrouter',
      storedProviders.openrouter,
      legacyProvider === 'openrouter' ? stored.model : undefined,
    ),
  }
  providers[primaryProvider].enabled = true

  return { primaryProvider, fallbackProviders, providers }
}

export function validateAiModelConfig(
  value: unknown,
): { config: AiModelConfig; error?: never } | { config?: never; error: string } {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const configInput =
    input.config && typeof input.config === 'object'
      ? (input.config as Record<string, unknown>)
      : input
  if (!isAiProvider(configInput.primaryProvider)) {
    return { error: 'Selecciona un proveedor principal válido' }
  }
  const providersInput =
    configInput.providers && typeof configInput.providers === 'object'
      ? (configInput.providers as Record<string, unknown>)
      : {}
  const providers = {} as Record<AiProvider, AiProviderConfig>
  for (const provider of AI_PROVIDERS) {
    const candidate =
      providersInput[provider] && typeof providersInput[provider] === 'object'
        ? (providersInput[provider] as Record<string, unknown>)
        : {}
    if (!isValidAiModelId(candidate.model)) {
      return { error: `Ingresa un modelo válido para ${provider}` }
    }
    providers[provider] = {
      enabled: candidate.enabled === true,
      model: candidate.model,
    }
  }
  providers[configInput.primaryProvider].enabled = true

  const requestedFallbacks = Array.isArray(configInput.fallbackProviders)
    ? configInput.fallbackProviders
    : []
  const fallbackProviders = requestedFallbacks.filter(
    (provider, index, values): provider is AiProvider =>
      isAiProvider(provider) &&
      provider !== configInput.primaryProvider &&
      values.indexOf(provider) === index,
  )
  for (const provider of AI_PROVIDERS) {
    if (provider !== configInput.primaryProvider && !fallbackProviders.includes(provider)) {
      fallbackProviders.push(provider)
    }
  }

  return {
    config: {
      primaryProvider: configInput.primaryProvider,
      fallbackProviders,
      providers,
    },
  }
}

export async function getAiModelConfig(
  firestore: FirebaseFirestore.Firestore,
): Promise<AiModelConfig> {
  const snapshot = await firestore.doc(AI_CONFIG_DOCUMENT).get()
  return normalizeAiModelConfig(snapshot.data())
}

export function getEnabledProviderOrder(config: AiModelConfig): AiProvider[] {
  return [config.primaryProvider, ...config.fallbackProviders].filter(
    (provider, index, values) =>
      values.indexOf(provider) === index && config.providers[provider].enabled,
  )
}
