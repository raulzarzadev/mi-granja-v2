import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { useFormDraft } from '@/hooks/useFormDraft'

beforeEach(() => localStorage.clear())
it('restaura campos internos y mantiene borradores de formularios separados', () => {
  const key = 'sale:user:farm:1'
  const saved = { buyer: 'Ana', notes: 'Nota', animalWeights: { h: 35000 } }
  localStorage.setItem(key, JSON.stringify(saved))
  const { result, rerender } = renderHook(
    ({ draftKey, open }) => {
      const [value, setValue] = useState({ buyer: '', notes: '', animalWeights: {} })
      useFormDraft(draftKey, open, value, setValue)
      return { value, setValue }
    },
    { initialProps: { draftKey: key, open: true } },
  )
  expect(result.current.value).toEqual(saved)
  act(() => result.current.setValue({ ...saved, buyer: 'María' }))
  expect(JSON.parse(localStorage.getItem(key)!).buyer).toBe('María')
  rerender({ draftKey: key, open: false })
  expect(JSON.parse(localStorage.getItem(key)!).buyer).toBe('María')
  const birthKey = 'birth:user:farm:2'
  localStorage.setItem(
    birthKey,
    JSON.stringify({ buyer: '', notes: 'Crías capturadas', animalWeights: {} }),
  )
  rerender({ draftKey: birthKey, open: true })
  expect(result.current.value.notes).toBe('Crías capturadas')
  expect(JSON.parse(localStorage.getItem(key)!).buyer).toBe('María')
})
