import { fireEvent, render, screen } from '@testing-library/react'
import NotificationsBell from '@/components/NotificationsBell'

jest.mock('@/hooks/useReminders', () => ({
  useReminders: () => ({
    getOverdueReminders: () => [],
    getTodayReminders: () => [],
    getBadgeCount: () => 0,
  }),
}))

it('mantiene el panel dentro de una pantalla angosta y lo reajusta al cambiar el ancho', () => {
  const originalWidth = window.innerWidth
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 280 })
  const bounds = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ right: 244, bottom: 76 } as DOMRect)
  const { unmount } = render(<NotificationsBell />)
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones y recordatorios' }))
  expect(screen.getByRole('menu')).toHaveStyle({ left: '12px', width: '256px', top: '84px' })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  fireEvent(window, new Event('resize'))
  expect(screen.getByRole('menu')).toHaveStyle({ left: '12px', width: '320px' })
  unmount()
  bounds.mockRestore()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
})

it('se titula "Notificaciones y recordatorios" y "Ver todos" lleva a la vista completa', () => {
  render(<NotificationsBell />)
  fireEvent.click(screen.getByRole('button', { name: 'Notificaciones y recordatorios' }))
  expect(
    screen.getByRole('heading', { name: 'Notificaciones y recordatorios' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/recordatorios')
})
