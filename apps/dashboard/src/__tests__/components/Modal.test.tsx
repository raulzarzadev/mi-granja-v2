import { fireEvent, render, screen } from '@testing-library/react'
import { Modal } from '@/components/Modal'

describe('Modal', () => {
  it('uses a body portal so nested dialogs are not clipped by their parent', () => {
    render(
      <div data-testid="transformed-parent" style={{ transform: 'scale(.95)', overflow: 'hidden' }}>
        <Modal isOpen onClose={jest.fn()} title="Modal secundario">
          Contenido completo
        </Modal>
      </div>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Modal secundario' })
    expect(screen.getByTestId('transformed-parent')).not.toContainElement(dialog)
    expect(dialog.parentElement).toBe(document.body)
  })

  it('only closes the topmost dialog with Escape', () => {
    const closeParent = jest.fn()
    const closeChild = jest.fn()

    render(
      <>
        <Modal isOpen onClose={closeParent} title="Padre">
          Contenido padre
        </Modal>
        <Modal isOpen onClose={closeChild} title="Hijo">
          Contenido hijo
        </Modal>
      </>,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(closeChild).toHaveBeenCalledTimes(1)
    expect(closeParent).not.toHaveBeenCalled()
  })

  it('keeps body scrolling locked while a parent dialog remains open', () => {
    const { rerender, unmount } = render(
      <>
        <Modal key="parent" isOpen onClose={jest.fn()} title="Padre">
          Contenido padre
        </Modal>
        <Modal key="child" isOpen onClose={jest.fn()} title="Hijo">
          Contenido hijo
        </Modal>
      </>,
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal key="parent" isOpen onClose={jest.fn()} title="Padre">
        Contenido padre
      </Modal>,
    )

    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
