import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Tabs, { useSidebarSubItems } from '@/components/Tabs'

const FilterSection = () => {
  const [type, setType] = useState(0)
  useSidebarSubItems({
    labels: ['Todos', 'Salud'],
    badges: [3, 1],
    activeIndex: type,
    onSelect: setType,
  })
  return <p>Filtro activo: {type}</p>
}

const renderNested = () =>
  render(
    <Tabs
      tabsId="main"
      sidebarOnDesktop
      tabs={[
        {
          label: 'Granja',
          content: (
            <Tabs
              tabsId="farm"
              tabs={[
                { label: 'Resumen', content: <p>Panel resumen</p> },
                { label: 'Ventas', content: <p>Panel ventas</p> },
              ]}
            />
          ),
        },
        { label: 'Perfil', content: <p>Panel perfil</p> },
      ]}
    />,
  )

describe('Tabs sidebarOnDesktop', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('muestra los sub-tabs del tab activo en el menú lateral', () => {
    renderNested()
    // Horizontal (role=tab) + menú lateral (button)
    expect(screen.getByRole('tab', { name: 'Ventas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ventas' })).toBeInTheDocument()
    expect(screen.getByText('Panel resumen')).toBeInTheDocument()
  })

  it('el menú lateral cambia el sub-tab del contenido', () => {
    renderNested()
    const sidebarVentas = screen.getByRole('button', { name: 'Ventas' })
    act(() => fireEvent.click(sidebarVentas))
    expect(screen.getByText('Panel ventas')).toBeInTheDocument()
    expect(sidebarVentas).toHaveAttribute('aria-current', 'page')
    expect(window.location.search).toContain('farm=ventas')
  })

  it('el tab horizontal sincroniza el menú lateral', () => {
    renderNested()
    act(() => fireEvent.click(screen.getByRole('tab', { name: 'Ventas' })))
    const sidebarVentas = screen.getByRole('button', { name: 'Ventas' })
    expect(sidebarVentas).toHaveAttribute('aria-current', 'page')
  })

  it('quita los sub-tabs al cambiar a un tab sin hijos', () => {
    renderNested()
    act(() => fireEvent.click(screen.getByRole('tab', { name: 'Perfil' })))
    expect(screen.queryByRole('button', { name: 'Ventas' })).not.toBeInTheDocument()
  })

  it('muestra sub-items controlados (filtros) y los selecciona', () => {
    render(
      <Tabs
        tabsId="main"
        sidebarOnDesktop
        tabs={[{ label: 'Registros', content: <FilterSection /> }]}
      />,
    )
    const salud = screen.getByRole('button', { name: /Salud/ })
    act(() => fireEvent.click(salud))
    expect(screen.getByText('Filtro activo: 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salud/ })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Tabs bottomOnMobile', () => {
  it('cambia de sección y restaura la selección al navegar atrás', () => {
    window.history.replaceState({}, '', '/')
    render(
      <Tabs
        tabsId="dashboard-main"
        bottomOnMobile
        sidebarOnDesktop
        tabs={[
          { label: '🐄 Animales', content: <p>Inventario de animales</p> },
          { label: '📆 Recordatorios', badgeCount: 3, content: <p>Lista de recordatorios</p> },
          { label: '👤 Perfil', content: <p>Datos del perfil</p> },
        ]}
      />,
    )
    const reminders = screen.getByRole('tab', { name: /Recordatorios/ })
    expect(reminders).toHaveTextContent('3')
    fireEvent.click(reminders)
    expect(reminders).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Lista de recordatorios')
    expect(window.location.search).toContain('dashboard-main=recordatorios')
    act(() => {
      window.history.replaceState({}, '', '/?dashboard-main=animales')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('tab', { name: 'Animales' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Inventario de animales')
  })
})
