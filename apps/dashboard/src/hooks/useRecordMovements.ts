import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import { createRecordMovementService } from '@/lib/domain/record-movement-service'
import { commitCentralRecord, commitMovement, undoMovement } from '@/lib/record-movements'
import type { Animal } from '@/types/animals'

export type { HealthMovementInput } from '@/lib/domain/record-movement-service'

export function useRecordMovements(animals: Animal[] = []) {
  const { user } = useSelector((state: RootState) => state.auth)
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  return createRecordMovementService(
    animals,
    { userId: user?.id ?? '', farmId: currentFarm?.id ?? '' },
    { commitMovement, commitCentralRecord, undoMovement },
  )
}
