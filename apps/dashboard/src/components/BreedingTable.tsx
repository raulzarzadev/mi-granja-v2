'use client'

import React, { useMemo, useState } from 'react'
import Button from '@/components/buttons/Button'
import ButtonConfirm from '@/components/buttons/ButtonConfirm'
import DataTable, { ColumnDef } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { formatDate } from '@/lib/dates'
import { Animal, animals_types_labels } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'

interface BreedingTableProps {
  records: BreedingRecord[]
  animals: Animal[]
  onSelect: (record: BreedingRecord) => void
  onDelete: (recordIds: string[]) => void
  onConfirmPregnancy?: (record: BreedingRecord) => void
  toolbar?: React.ReactNode
  renderCard?: (row: { record: BreedingRecord; male: Animal | undefined; status: ReturnType<typeof getBreedingStatus> }) => React.ReactNode
  onView?: (row: { record: BreedingRecord; male: Animal | undefined; status: ReturnType<typeof getBreedingStatus> }) => React.ReactNode
}

function getBreedingStatus(record: BreedingRecord) {
  let pending = 0
  let pregnant = 0
  let births = 0
  let totalOffspring = 0

  for (const f of record.femaleBreedingInfo) {
    if (f.actualBirthDate) {
      births++
      totalOffspring += f.offspring?.length || 0
    } else if (f.pregnancyConfirmedDate) {
      pregnant++
    } else {
      pending++
    }
  }

  return { pending, pregnant, births, totalOffspring }
}

function statusLabel(s: ReturnType<typeof getBreedingStatus>) {
  const parts: string[] = []
  if (s.pending > 0) parts.push(`${s.pending} pend`)
  if (s.pregnant > 0) parts.push(`${s.pregnant} emb`)
  if (s.births > 0) parts.push(`${s.births} partos`)
  return parts.join(' / ') || '-'
}

function statusColor(s: ReturnType<typeof getBreedingStatus>) {
  if (s.pending > 0) return 'bg-yellow-100 text-yellow-800'
  if (s.pregnant > 0) return 'bg-blue-100 text-blue-800'
  if (s.births > 0) return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-600'
}

type EnrichedBreeding = {
  record: BreedingRecord
  male: Animal | undefined
  status: ReturnType<typeof getBreedingStatus>
}

const BreedingTable: React.FC<BreedingTableProps> = ({
  records,
  animals,
  onSelect,
  onDelete,
  onConfirmPregnancy,
  toolbar,
  renderCard,
  onView,
}) => {
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set())

  const enriched: EnrichedBreeding[] = useMemo(
    () =>
      records.map((r) => ({
        record: r,
        male: animals.find((a) => a.id === r.maleId),
        status: getBreedingStatus(r),
      })),
    [records, animals],
  )

  const columns: ColumnDef<EnrichedBreeding>[] = useMemo(
    () => [
      {
        key: 'breedingId',
        label: 'ID',
        sortable: true,
        sortFn: (a, b) =>
          (a.record.breedingId || '').localeCompare(b.record.breedingId || '', 'es', {
            numeric: true,
          }),
        render: (row) => (
          <span className="font-mono text-gray-700">{row.record.breedingId || 'Sin ID'}</span>
        ),
        className: 'whitespace-nowrap',
        headerClassName: 'w-28',
      },
      {
        key: 'date',
        label: 'Fecha',
        sortable: true,
        sortFn: (a, b) =>
          (a.record.breedingDate?.getTime() || 0) - (b.record.breedingDate?.getTime() || 0),
        render: (row) => (
          <span className="text-gray-700">
            {row.record.breedingDate ? formatDate(row.record.breedingDate, 'dd MMM yy') : '-'}
          </span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'male',
        label: 'Macho',
        sortable: true,
        sortFn: (a, b) =>
          (a.male?.animalNumber || '').localeCompare(b.male?.animalNumber || '', 'es', {
            numeric: true,
          }),
        render: (row) => (
          <>
            <span className="font-medium text-gray-900">{row.male?.animalNumber || '?'}</span>
            {row.male && (
              <span className="ml-1 text-xs text-gray-500">
                {animals_types_labels[row.male.type]}
              </span>
            )}
          </>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'females',
        label: 'Hembras',
        sortable: true,
        sortFn: (a, b) => a.record.femaleBreedingInfo.length - b.record.femaleBreedingInfo.length,
        render: (row) => <>{row.record.femaleBreedingInfo.length}</>,
        className: 'text-center',
        headerClassName: 'text-center',
      },
      {
        key: 'status',
        label: 'Estado',
        sortable: true,
        sortFn: (a, b) => {
          const scoreA = a.status.pending * 100 + a.status.pregnant * 10
          const scoreB = b.status.pending * 100 + b.status.pregnant * 10
          return scoreB - scoreA
        },
        render: (row) =>
          row.record.status === 'finished' ? (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              Terminada
            </span>
          ) : (
            <span
              className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${statusColor(row.status)}`}
            >
              {statusLabel(row.status)}
            </span>
          ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'offspring',
        label: 'Crias',
        sortable: true,
        sortFn: (a, b) => a.status.totalOffspring - b.status.totalOffspring,
        render: (row) => <>{row.status.totalOffspring > 0 ? row.status.totalOffspring : '-'}</>,
        className: 'hidden sm:table-cell whitespace-nowrap',
        headerClassName: 'hidden sm:table-cell',
      },
    ],
    [],
  )

  return (
    <>
      <DataTable
        data={enriched}
        columns={columns}
        rowKey={(row) => row.record.id}
        defaultSortKey="date"
        defaultSortDir="desc"
        sessionStorageKey="mg_last_breeding_id"
        onRowClick={(row) => onSelect(row.record)}
        selectable
        title="Montas"
        toolbar={toolbar}
        renderCard={renderCard}
        viewModeKey="montas_view_mode"
        onView={onView}
        renderBulkActions={(selectedIds, clearSelection) => (
          <Button
            size="xs"
            color="error"
            icon="delete"
            onClick={() => {
              setBulkDeleteIds(selectedIds)
              setShowBulkDeleteModal(true)
            }}
          >
            Eliminar
          </Button>
        )}
        renderActions={(row) => (
          <>
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              icon="edit"
              onClick={() => onSelect(row.record)}
            >
              Editar
            </Button>
            {onConfirmPregnancy && row.status.pending > 0 && (
              <Button
                size="xs"
                variant="ghost"
                color="success"
                icon="pregnant"
                onClick={() => onConfirmPregnancy(row.record)}
              >
                Embarazo
              </Button>
            )}
            <ButtonConfirm
              openLabel="Eliminar"
              openProps={{ size: 'xs', variant: 'ghost', color: 'error', icon: 'delete' }}
              confirmProps={{ color: 'error' }}
              confirmText={`¿Eliminar monta ${row.record.breedingId || row.record.id}? Esta accion no se puede deshacer.`}
              confirmLabel="Eliminar"
              onConfirm={() => {
                onDelete([row.record.id])
                return undefined
              }}
            />
          </>
        )}
        emptyMessage="No hay montas."
      />
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Eliminar montas"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700">
            ¿Eliminar {bulkDeleteIds.size} monta{bulkDeleteIds.size !== 1 ? 's' : ''}? Esta accion
            no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              onClick={() => setShowBulkDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              color="error"
              icon="delete"
              onClick={() => {
                onDelete(Array.from(bulkDeleteIds))
                setShowBulkDeleteModal(false)
                setBulkDeleteIds(new Set())
              }}
            >
              Eliminar {bulkDeleteIds.size}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default BreedingTable
