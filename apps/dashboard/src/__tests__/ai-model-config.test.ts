import {
  DEFAULT_OPENROUTER_MODEL,
  normalizeAiModelConfig,
  validateAiModelConfig,
} from '@/lib/ai/model-config'

describe('AI model configuration', () => {
  it('uses the stored OpenRouter model', () => {
    expect(normalizeAiModelConfig({ model: 'moonshotai/kimi-k2.5' })).toEqual({
      provider: 'openrouter',
      model: 'moonshotai/kimi-k2.5',
    })
  })

  it('falls back to the safe default when the stored value is invalid', () => {
    const previousModel = process.env.OPENROUTER_MODEL
    delete process.env.OPENROUTER_MODEL
    expect(normalizeAiModelConfig({ model: 'modelo con espacios' }).model).toBe(
      DEFAULT_OPENROUTER_MODEL,
    )
    if (previousModel === undefined) delete process.env.OPENROUTER_MODEL
    else process.env.OPENROUTER_MODEL = previousModel
  })

  it('rejects malformed model identifiers', () => {
    expect(validateAiModelConfig({ model: '' })).toEqual({
      error: 'Selecciona un modelo válido de OpenRouter',
    })
    expect(validateAiModelConfig({ model: 'model<script>' }).config).toBeUndefined()
  })
})
