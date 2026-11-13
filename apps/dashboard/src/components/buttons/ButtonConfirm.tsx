import { useRef, useState } from 'react'
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
  children,
}: {
  openLabel?: string
  closeLabel?: string
  confirmText?: string
  confirmLabel?: string
  onConfirm?: () => undefined | Promise<unknown>
  openProps?: ButtonProps
  confirmProps?: ButtonProps
  children?: React.ReactNode
}) {
  const modal = useModal({
    title: 'Confirmación',
  })
  const [isLoading, setIsLoading] = useState(false)
  const confirming = useRef(false)

  const handleConfirm = async (): Promise<void> => {
    if (confirming.current) return
    if (!onConfirm) {
      modal.onClose()
      return
    }
    confirming.current = true
    setIsLoading(true)
    try {
      await onConfirm()
      modal.onClose()
    } catch (error) {
      console.error(error)
    } finally {
      confirming.current = false
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        {...openProps}
        onClick={modal.toggleModal}
        disabled={isLoading || openProps?.disabled}
      >
        {openLabel}
        <span className="sr-only">Abrir modal de confirmación</span>
      </Button>
      <Modal
        {...modal}
        onClose={() => {
          if (!confirming.current) modal.onClose()
        }}
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{confirmText}</p>
          <div>{children}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" color="neutral" onClick={modal.onClose} disabled={isLoading}>
              {closeLabel}
            </Button>
            <Button
              {...confirmProps}
              onClick={handleConfirm}
              disabled={isLoading || confirmProps?.disabled}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
