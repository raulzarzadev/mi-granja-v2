'use client'

import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalMilkRecord from '@/components/ModalMilkRecord'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import type { NoursingMotherRow } from '../columns/noursingMothersColumns'

interface Props {
  noursingMothersRows: NoursingMotherRow[]
  columns: ColumnDef<NoursingMotherRow>[]
  onChangeStage?: (animals: Animal[]) => void
}

export default function TabStageNoursingMothers({
  noursingMothersRows,
  columns,
  onChangeStage,
}: Props) {
  const overdue = noursingMothersRows.filter((r) => r.daysUntilWean !== null && r.daysUntilWean < 0)

  return (
    <div>
      {noursingMothersRows.length > 0 && (
        <div className="mt-2 mb-4 space-y-2">
          {overdue.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-red-600">
                Destetes atrasados ({overdue.length})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {overdue.map((r) => (
                  <ModalAnimalDetails
                    key={r.animal.id}
                    animal={r.animal}
                    triggerComponent={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:shadow-sm bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
                      >
                        {r.animal.animalNumber}
                        <span className="text-[10px] opacity-70">
                          ({Math.abs(r.daysUntilWean!)}d)
                        </span>
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-gray-500 mb-2">
        Hembras con lactancia activa. Pueden estar también gestantes. El destete se registra en cada
        cría; el ordeño se registra desde Leche.
      </p>
      <DataTable
        title={`${animal_stage_config.crias_lactantes.icon} Madres / Lecheras`}
        data={noursingMothersRows}
        columns={columns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="unweanDate"
        sessionStorageKey="mg_last_noursing_id"
        selectable
        renderBulkActions={(ids) => {
          const selectedMothers = noursingMothersRows
            .filter((r) => ids.has(r.animal.id))
            .map((r) => r.animal)
          if (selectedMothers.length === 0) return null
          return (
            <>
              {onChangeStage && selectedMothers.length > 0 && (
                <Button size="xs" color="primary" onClick={() => onChangeStage(selectedMothers)}>
                  ⇄ Cambiar etapa ({selectedMothers.length})
                </Button>
              )}
            </>
          )
        }}
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
        renderActions={(row) => {
          return (
            <>
              <ModalMilkRecord animal={row.animal} />
              {onChangeStage && (
                <Button
                  size="xs"
                  variant="ghost"
                  color="primary"
                  onClick={() => onChangeStage([row.animal])}
                >
                  ⇄ Cambiar etapa
                </Button>
              )}
            </>
          )
        }}
        emptyMessage="No hay madres o lecheras con lactancia activa."
      />
    </div>
  )
}
