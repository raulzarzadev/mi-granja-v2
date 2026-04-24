'use client'

import { useState } from 'react'
import BreedingCard from '@/components/BreedingCard'
import BreedingTable from '@/components/BreedingTable'
import Button from '@/components/buttons/Button'
import { Modal } from '@/components/Modal'
import ModalOnboarding from '@/components/onboarding/ModalOnboarding'
import { formatDate } from '@/lib/dates'
import type { Animal } from '@/types/animals'
import { animals_types_labels } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import type { BreedingActionHandlers } from '@/types/components/breeding'
import {
  CHIP_COLORS,
  groupFemalesByStatus,
  sortFemalesByAnimalNumber,
} from '../helpers/breedingViewHelpers'

interface DuplicateEntry {
  id: string
  animalNumber: string
  records: { id: string; label: string }[]
}

interface Props {
  orderedBreedings: {
    needPregnancyConfirmation: BreedingRecord[]
    terminated: BreedingRecord[]
  }
  animals: Animal[]
  duplicateEmpadreFemales: DuplicateEntry[]
  onSelectRecord: (record: BreedingRecord) => void
  onDeleteRecord: (id: string) => Promise<void>
  onConfirmPregnancy: BreedingActionHandlers['onConfirmPregnancy']
  onAddBirth: BreedingActionHandlers['onAddBirth']
  onUnconfirmPregnancy: BreedingActionHandlers['onUnconfirmPregnancy']
  onRemoveFromBreeding: BreedingActionHandlers['onRemoveFromBreeding']
  onDeleteBirth: BreedingActionHandlers['onDeleteBirth']
  onEditRecord: (record: BreedingRecord) => void
  onNewEmpadre: () => void
  updateBreedingRecord: (id: string, data: Partial<BreedingRecord>) => Promise<void>
}

export default function TabStageEmpadre({
  orderedBreedings,
  animals,
  duplicateEmpadreFemales,
  onSelectRecord,
  onDeleteRecord,
  onConfirmPregnancy,
  onAddBirth,
  onUnconfirmPregnancy,
  onRemoveFromBreeding,
  onDeleteBirth,
  onEditRecord,
  onNewEmpadre,
  updateBreedingRecord,
}: Props) {
  const [showOnboarding, setShowOnboarding] = useState(false)

  return (
    <div>
      <ModalOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {duplicateEmpadreFemales.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          <div className="font-semibold mb-2">
            ⚠️ {duplicateEmpadreFemales.length} hembra
            {duplicateEmpadreFemales.length !== 1 ? 's' : ''} en múltiples empadres activos
          </div>
          <div className="text-xs text-amber-800 mb-2">
            Termina el empadre anterior o confirma embarazo para que no se cuenten dos veces.
          </div>
          <ul className="text-xs space-y-1">
            {duplicateEmpadreFemales.map((d) => {
              const recordsToShow = orderedBreedings.needPregnancyConfirmation.filter((r) =>
                d.records.some((dr) => dr.id === r.id),
              )
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-amber-900">{d.animalNumber}</span>
                  <span className="text-amber-700">en</span>
                  {recordsToShow.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRecord(r)}
                      className="px-1.5 py-0.5 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 cursor-pointer"
                    >
                      {r.breedingId || r.id.slice(0, 6)}
                    </button>
                  ))}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <BreedingTable
        records={[...orderedBreedings.needPregnancyConfirmation]}
        animals={animals}
        onSelect={onSelectRecord}
        onDelete={async (ids) => {
          for (const id of ids) await onDeleteRecord(id)
        }}
        onConfirmPregnancy={(record) => onConfirmPregnancy?.(record, '')}
        toolbar={
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              icon="help"
              onClick={() => setShowOnboarding(true)}
              title="Ver guia de primeros pasos"
            />
            <Button size="xs" color="success" icon="add" onClick={onNewEmpadre}>
              Nuevo Empadre
            </Button>
          </div>
        }
        renderCard={(row) => (
          <BreedingCard
            record={row.record}
            animals={animals}
            onEdit={onEditRecord}
            onAddBirth={onAddBirth}
            onConfirmPregnancy={onConfirmPregnancy}
            onUnconfirmPregnancy={onUnconfirmPregnancy}
            onDelete={(rec) => onDeleteRecord(rec.id)}
            onRemoveFromBreeding={onRemoveFromBreeding}
            onDeleteBirth={onDeleteBirth}
          />
        )}
        onFinish={async (r) => {
          await updateBreedingRecord(r.id, { status: 'finished' })
        }}
      />
      {orderedBreedings.terminated.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 py-2">
            Empadres terminados ({orderedBreedings.terminated.length})
          </summary>
          <div className="mt-2">
            <BreedingTable
              records={orderedBreedings.terminated}
              animals={animals}
              onSelect={onSelectRecord}
              onDelete={async (ids) => {
                for (const id of ids) await onDeleteRecord(id)
              }}
            />
          </div>
        </details>
      )}
    </div>
  )
}
