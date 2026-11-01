import { act, renderHook } from '@testing-library/react'
import { useFixedViewport } from '@/hooks/useFixedViewport'

it('ancla los controles al área visible y actualiza al cambiar el viewport', () => {
  const original = window.visualViewport
  const viewport = Object.assign(new EventTarget(), {
    width: 390,
    height: 691,
    offsetTop: 0,
    offsetLeft: 0,
  })
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  const { result, unmount } = renderHook(() => useFixedViewport())
  expect(result.current).toMatchObject({
    '--fixed-visible-width': '390px',
    '--fixed-bottom-edge': '691px',
  })
  act(() => {
    viewport.height = 400
    viewport.dispatchEvent(new Event('resize'))
  })
  expect(result.current['--fixed-bottom-edge' as keyof typeof result.current]).toBe('400px')
  unmount()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: original })
})
