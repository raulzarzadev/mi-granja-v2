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

function BreedingViewModal({
  record,
  animals,
  onEditRecord,
  updateBreedingRecord,
}: {
  record: BreedingRecord
  animals: Animal[]
  onEditRecord: (r: BreedingRecord) => void
  updateBreedingRecord: (id: string, data: Partial<BreedingRecord>) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const male = animals.find((a) => a.id === record.maleId)
  const groups = groupFemalesByStatus(record.femaleBreedingInfo)

  return (
    <>
      <Button size="xs" variant="ghost" color="primary" icon="view" onClick={() => setOpen(true)}>
        Ver
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`Empadre ${record.breedingId || ''}`}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Fecha</span>
            <span className="font-medium">
              {record.breedingDate ? formatDate(record.breedingDate, 'dd MMM yyyy') : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Macho</span>
            <span className="font-medium">
              {male?.animalNumber || '?'}{' '}
              <span className="text-xs text-gray-400">
                {male ? animals_types_labels[male.type] : ''}
              </span>
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Hembras ({record.femaleBreedingInfo.length})
            </p>
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.key}>
                  <span
                    className={`text-xs font-semibold ${g.items.length === 0 ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {g.label} ({g.items.length})
                  </span>
                  {g.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {sortFemalesByAnimalNumber(g.items, animals).map((fi) => {
                        const fem = animals.find((a) => a.id === fi.femaleId)
                        return (
                          <span
                            key={fi.femaleId}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${CHIP_COLORS[g.key]}`}
                          >
                            {fem?.animalNumber || fi.femaleId}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {record.status === 'finished' && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
              Empadre terminado
            </div>
          )}
          {confirming ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-sm text-amber-800">
                Las hembras pendientes (en empadre) quedarán disponibles para nuevos empadres. Las
                que amamantan seguirán ocupadas hasta el destete.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  color="neutral"
                  onClick={() => setConfirming(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  icon="check_circle"
                  className="flex-1"
                  onClick={async () => {
                    await updateBreedingRecord(record.id, { status: 'finished' })
                    setOpen(false)
                    setConfirming(false)
                  }}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                color="primary"
                icon="edit"
                onClick={() => {
                  setOpen(false)
                  onEditRecord(record)
                }}
                className="flex-1"
              >
                Editar
              </Button>
              {record.status !== 'finished' ? (
                <Button
                  size="sm"
                  variant="outline"
                  color="warning"
                  icon="check_circle"
                  className="flex-1"
                  onClick={() => setConfirming(true)}
                >
                  Terminar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  color="success"
                  className="flex-1"
                  icon="check_circle"
                  onClick={async () => {
                    await updateBreedingRecord(record.id, { status: 'active' })
                    setOpen(false)
                  }}
                >
                  Reactivar
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
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

  console.log({orderedBreedings})
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
        onView={(row) => (
          <BreedingViewModal
            record={row.record}
            animals={animals}
            onEditRecord={onEditRecord}
            updateBreedingRecord={updateBreedingRecord}
          />
        )}
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
              onView={(row) => (
                <BreedingViewModal
                  record={row.record}
                  animals={animals}
                  onEditRecord={onEditRecord}
                  updateBreedingRecord={updateBreedingRecord}
                />
              )}
            />
          </div>
        </details>
      )}
    </div>
  )
}
