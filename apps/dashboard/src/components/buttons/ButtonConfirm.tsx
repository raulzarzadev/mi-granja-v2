import { useState } from 'react'
import { useModal } from '@/hooks/useModal'
import { Modal } from '../Modal'
import Button, { ButtonProps } from './Button'

export default function ButtonConfirm({
  openLabel = 'Confirmar',
  closeLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  confirmText = '¿Estás seguro de que quieres continuar?',
  onConfirm,
  openProps,
  confirmProps,
}: {
  openLabel?: string
  closeLabel?: string
  confirmText?: string
  confirmLabel?: string
  onConfirm?: () => void | Promise<unknown>
  openProps?: ButtonProps
  confirmProps?: ButtonProps
}) {
  const modal = useModal({
    title: 'Confirmación',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async (): Promise<void> => {
    if (!onConfirm) {
      modal.onClose()
      return
    }
    const result = onConfirm()
    if (result instanceof Promise) {
      setIsLoading(true)
      try {
        await result
        modal.onClose()
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    } else {
      modal.onClose()
    }
  }

  return (
    <>
      <Button {...openProps} onClick={modal.toggleModal} disabled={isLoading}>
        {openLabel}
        <span className="sr-only">Abrir modal de confirmación</span>
      </Button>
      <Modal {...modal}>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">{modal.title}</h2>
          <p className="mb-4">{confirmText}</p>
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                modal.onClose()
              }}
            >
              {closeLabel}
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading} {...confirmProps}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
