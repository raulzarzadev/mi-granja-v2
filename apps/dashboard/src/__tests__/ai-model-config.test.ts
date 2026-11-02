import {
  aiProviderRouting,
  DEFAULT_OPENROUTER_MODEL,
  getEnabledProviderOrder,
  normalizeAiModelConfig,
  validateAiModelConfig,
} from '@/lib/ai/model-config'

describe('AI model configuration', () => {
  it('migrates the legacy OpenRouter configuration', () => {
    const config = normalizeAiModelConfig({ model: 'moonshotai/kimi-k2.5' })
    expect(config.primaryProvider).toBe('openrouter')
    expect(config.providers.openrouter).toEqual({
      enabled: true,
      model: 'moonshotai/kimi-k2.5',
    })
  })

  it('falls back to safe defaults when stored models are invalid', () => {
    const previousModel = process.env.OPENROUTER_MODEL
    delete process.env.OPENROUTER_MODEL
    expect(
      normalizeAiModelConfig({ model: 'modelo con espacios' }).providers.openrouter.model,
    ).toBe(DEFAULT_OPENROUTER_MODEL)
    if (previousModel === undefined) delete process.env.OPENROUTER_MODEL
    else process.env.OPENROUTER_MODEL = previousModel
  })

  it('validates provider models and enables the primary provider', () => {
    const result = validateAiModelConfig({
      config: {
        primaryProvider: 'openai',
        fallbackProviders: ['kimi', 'openrouter'],
        providers: {
          openai: { enabled: false, model: 'gpt-5-mini' },
          kimi: { enabled: true, model: 'kimi-k2.6' },
          openrouter: { enabled: false, model: 'google/gemini-2.5-flash' },
        },
      },
    })
    expect(result.config?.providers.openai.enabled).toBe(true)
    expect(result.config && getEnabledProviderOrder(result.config)).toEqual(['openai', 'kimi'])
  })

  it('rejects malformed providers and model identifiers', () => {
    expect(validateAiModelConfig({ primaryProvider: 'unknown' })).toEqual({
      error: 'Selecciona un proveedor principal válido',
    })
    const invalid = normalizeAiModelConfig(undefined)
    invalid.providers.kimi.model = 'model<script>'
    expect(validateAiModelConfig(invalid).config).toBeUndefined()
  })
})

describe('OpenAI mediante OpenRouter', () => {
  it('elige OpenAI por defecto y restringe su hosting al proveedor OpenAI', () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe('openai/gpt-6-luna-pro')
    expect(aiProviderRouting('openrouter', DEFAULT_OPENROUTER_MODEL)).toEqual({
      provider: { only: ['openai'], allow_fallbacks: false },
    })
  })
  it('mantiene independientes las rutas de otros proveedores y modelos', () => {
    expect(aiProviderRouting('openai', 'gpt-6.1-sol')).toEqual({})
    expect(aiProviderRouting('openrouter', 'google/gemini-2.5-flash')).toEqual({})
  })
})
