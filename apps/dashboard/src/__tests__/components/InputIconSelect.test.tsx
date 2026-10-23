import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import InputIconSelect, { type IconSelectOption } from '@/components/inputs/InputIconSelect'

type Species = 'oveja' | 'vaca' | 'cabra'

const OPTIONS: IconSelectOption<Species>[] = [
  { value: 'oveja', label: 'Oveja', icon: '🐑' },
  { value: 'vaca', label: 'Vaca', icon: '🐄' },
  { value: 'cabra', label: 'Cabra', icon: '🐐', disabled: true },
]

const Harness = ({ onChange = () => {} }: { onChange?: (v: Species) => void }) => {
  const [value, setValue] = useState<Species>('oveja')
  return (
    <form data-testid="form">
      <InputIconSelect
        aria-label="Especie"
        name="type"
        options={OPTIONS}
        value={value}
        onChange={(v) => {
          setValue(v)
          onChange(v)
        }}
      />
    </form>
  )
}

describe('InputIconSelect', () => {
  it('muestra el valor con su icono y abre la lista con iconos', () => {
    render(<Harness />)
    const combo = screen.getByRole('combobox', { name: 'Especie' })
    expect(combo).toHaveTextContent('Oveja')
    expect(combo.querySelector('svg')).not.toBeNull()

    fireEvent.click(combo)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0].querySelector('svg')).not.toBeNull()
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('selecciona con click y cierra', () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: /Vaca/ }))
    expect(onChange).toHaveBeenCalledWith('vaca')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Vaca')
  })

  it('navega con teclado y salta opciones deshabilitadas', () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    const combo = screen.getByRole('combobox')
    fireEvent.keyDown(combo, { key: 'ArrowDown' }) // abre en Oveja
    fireEvent.keyDown(combo, { key: 'ArrowDown' }) // Vaca
    fireEvent.keyDown(combo, { key: 'ArrowDown' }) // Cabra deshabilitada → vuelve a Oveja
    fireEvent.keyDown(combo, { key: 'ArrowDown' }) // Vaca
    fireEvent.keyDown(combo, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('vaca')
  })

  it('no selecciona opciones deshabilitadas', () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: /Cabra/ }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('busca por letra con la lista cerrada y cierra con Escape', () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    const combo = screen.getByRole('combobox')
    fireEvent.keyDown(combo, { key: 'v' })
    expect(onChange).toHaveBeenCalledWith('vaca')

    fireEvent.keyDown(combo, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(combo, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('envía el valor en un input oculto para formularios', () => {
    render(<Harness />)
    const form = screen.getByTestId('form') as HTMLFormElement
    expect(new FormData(form).get('type')).toBe('oveja')
  })
})
