'use client'

import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import ModalBirthForm from '@/components/ModalBirthForm'
import type { RootState } from '@/features/store'
import { useRecordMovements } from '@/hooks/useRecordMovements'
import { createMovementId } from '@/lib/record-movements'
import type { Animal } from '@/types/animals'

export default function RegisterBirthFromStage({
  motherId,
  animals,
  onClose,
  onCompleted,
}: {
  motherId: string
  animals: Animal[]
  onClose: () => void
  onCompleted: () => void
}) {
  const records = useSelector((state: RootState) => state.breeding.breedingRecords)
  const { birth } = useRecordMovements(animals)
  const saved = useRef(false)
  // Conservar el empadre mientras la transacción actualiza la fuente viva.
  const [record] = useState(() => {
    const candidates = records.filter((record) =>
      record.femaleBreedingInfo?.some(
        (info) =>
          info.femaleId === motherId &&
          info.pregnancyConfirmedDate &&
          !info.actualBirthDate &&
          info.outcome !== 'aborted' &&
          info.outcome !== 'open',
      ),
    )
    return candidates.length === 1 ? candidates[0] : null
  })
  return (
    <ModalBirthForm
      isOpen
      selectedFemaleId={motherId}
      animals={animals}
      breedingRecord={record}
      onSubmit={async (form) => {
        await birth(createMovementId(), form, record)
        saved.current = true
      }}
      onClose={() => {
        if (saved.current) onCompleted()
        else onClose()
      }}
    />
  )
}
