'use client'

import { useState } from 'react'
import BreedingCard from '@/components/BreedingCard'
import BreedingTable from '@/components/BreedingTable'
import Button from '@/components/buttons/Button'
import ModalOnboarding from '@/components/onboarding/ModalOnboarding'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import type { BreedingActionHandlers } from '@/types/components/breeding'

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
  const {
    duplicateEmpadreWarningDismissed,
    setDuplicateEmpadreWarningDismissed,
  } = useUserPreferences()
  const showDuplicateWarning = !duplicateEmpadreWarningDismissed
  const saveDuplicateWarningPreference = (dismissed: boolean) => {
    void setDuplicateEmpadreWarningDismissed(dismissed).catch(() => undefined)
  }

  const finishBreeding = async (record: BreedingRecord) => {
    await updateBreedingRecord(record.id, { status: 'finished' })
  }

  return (
    <div>
      <ModalOnboarding isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {duplicateEmpadreFemales.length > 0 && showDuplicateWarning && (
        <div
          role="alert"
          className="relative mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 pr-12 text-sm text-amber-900"
        >
          <button
            type="button"
            onClick={() => saveDuplicateWarningPreference(true)}
            aria-label="Cerrar advertencia de empadres duplicados"
            title="Cerrar advertencia"
            className="absolute right-2 top-2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="font-semibold mb-2">
            ⚠️ {duplicateEmpadreFemales.length} hembra
            {duplicateEmpadreFemales.length !== 1 ? 's' : ''} en múltiples empadres activos
          </div>
          <div className="text-xs text-amber-800 mb-2">
            Termina el empadre anterior o confirma gestación para que no se cuenten dos veces.
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
          {duplicateEmpadreFemales.length > 0 && !showDuplicateWarning && (
            <button
              type="button"
              onClick={() => saveDuplicateWarningPreference(false)}
              aria-label="Mostrar advertencia de empadres duplicados"
              title="Mostrar advertencia de empadres duplicados"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-9.3 16a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L12 3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </button>
          )}
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
            onFinish={finishBreeding}
            onAddBirth={onAddBirth}
            onConfirmPregnancy={onConfirmPregnancy}
            onUnconfirmPregnancy={onUnconfirmPregnancy}
            onDelete={(rec) => onDeleteRecord(rec.id)}
            onRemoveFromBreeding={onRemoveFromBreeding}
            onDeleteBirth={onDeleteBirth}
          />
        )}
        onFinish={finishBreeding}
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
