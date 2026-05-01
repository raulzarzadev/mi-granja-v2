'use client'

import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { animal_stage_config } from '@/types/animals'
import type { UnweanedRow } from '../columns/destetesColumns'

interface Props {
  allCrias: UnweanedRow[]
  columns: ColumnDef<UnweanedRow>[]
  openBulkWean: (decision: 'engorda' | 'reproductor', ids: Set<string>) => void
}

export default function TabStageCrias({ allCrias, columns, openBulkWean }: Props) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Recién nacidos, en espera de destete.</p>
      <DataTable
        title={`${animal_stage_config.crias_lactantes.icon} Crías`}
        data={allCrias}
        columns={columns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="weanDate"
        sessionStorageKey="mg_last_destete_id"
        selectable
        renderBulkActions={(ids) => (
          <>
            <Button size="xs" color="warning" onClick={() => openBulkWean('engorda', ids)}>
              {animal_stage_config.engorda.icon} Engorda ({ids.size})
            </Button>
            <Button size="xs" color="error" onClick={() => openBulkWean('reproductor', ids)}>
              {animal_stage_config.reproductor.icon} Reproductor ({ids.size})
            </Button>
          </>
        )}
        onView={(row) => (
          <ModalAnimalDetails
            animal={row.animal}
            triggerComponent={
              <Button size="xs" variant="ghost" color="primary" icon="view">
                Ver
              </Button>
            }
          />
        )}
        renderActions={(row) => (
          <>
            <Button
              size="xs"
              variant="ghost"
              color="warning"
              onClick={() => openBulkWean('engorda', new Set([row.animal.id]))}
            >
              {animal_stage_config.engorda.icon} Engorda
            </Button>
            <Button
              size="xs"
              variant="ghost"
              color="error"
              onClick={() => openBulkWean('reproductor', new Set([row.animal.id]))}
            >
              {animal_stage_config.reproductor.icon} Reproductor
            </Button>
          </>
        )}
        emptyMessage="No hay crías pendientes de destete."
      />
    </div>
  )
}
