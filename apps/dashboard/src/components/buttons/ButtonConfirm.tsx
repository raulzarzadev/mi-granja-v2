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
  onConfirm?: () => undefined | Promise<unknown>
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
      <Modal {...modal} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{confirmText}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" color="neutral" onClick={modal.onClose} disabled={isLoading}>
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
