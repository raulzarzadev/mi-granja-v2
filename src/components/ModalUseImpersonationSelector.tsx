import { useModal } from '@/hooks/useModal'
import { Modal } from './Modal'
import UserImpersonationSelector from './UserImpersonationSelector'
import Button from './buttons/Button'

export const ModalUseImpersonationSelector = () => {
  const modal = useModal({ title: 'Seleccionar usuario para suplantar' })
  return (
    <div>
      <Button onClick={modal.toggleModal} variant="link">
        Seleccionar usuario para suplantar
      </Button>
      {/* Aquí iría el contenido del selector de usuarios */}
      <Modal {...modal}>
        <UserImpersonationSelector onClose={modal.closeModal} />
      </Modal>
    </div>
  )
}
