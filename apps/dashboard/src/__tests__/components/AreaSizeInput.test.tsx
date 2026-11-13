import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import AreaSizeInput from '@/components/inputs/AreaSizeInput'

function Counter({ initial = '10' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <AreaSizeInput id="area-size" value={value} onChange={setValue} />
}

beforeEach(() => {
  jest.useFakeTimers()
  // jsdom does not implement PointerEvent consistently.
  window.PointerEvent = MouseEvent as typeof PointerEvent
})
afterEach(() => jest.useRealTimers())

it('increments once for a normal click', () => {
  render(<Counter />)
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar metros cuadrados' }))
  expect(screen.getByRole('spinbutton')).toHaveValue(11)
})

it('repeats and animates while held, then stops without an extra release increment', () => {
  render(<Counter />)
  const plus = screen.getByRole('button', { name: 'Aumentar metros cuadrados' })
  fireEvent.pointerDown(plus, { button: 0 })
  act(() => jest.advanceTimersByTime(560))
  expect(screen.getByRole('spinbutton')).toHaveValue(13)
  expect(plus.querySelector('svg')?.getAttribute('class')).toContain('animate-')
  fireEvent.pointerUp(plus)
  fireEvent.click(plus)
  act(() => jest.advanceTimersByTime(1000))
  expect(screen.getByRole('spinbutton')).toHaveValue(13)
  expect(plus.querySelector('svg')?.getAttribute('class') || '').not.toContain('animate-')
})

it('does not decrement below zero', () => {
  render(<Counter initial="1" />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Reducir metros cuadrados' }), {
    button: 0,
  })
  act(() => jest.advanceTimersByTime(1000))
  expect(screen.getByRole('spinbutton')).toHaveValue(0)
})

it('clears a pending hold when unmounted', () => {
  const { unmount } = render(<Counter />)
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Aumentar metros cuadrados' }), {
    button: 0,
  })
  unmount()
  expect(jest.getTimerCount()).toBe(0)
})
