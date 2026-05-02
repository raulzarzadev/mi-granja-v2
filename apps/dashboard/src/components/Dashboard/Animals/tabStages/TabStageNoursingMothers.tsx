'use client'

import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import type { NoursingMotherRow } from '../columns/noursingMothersColumns'

interface Props {
  noursingMothersRows: NoursingMotherRow[]
  columns: ColumnDef<NoursingMotherRow>[]
  animals: Animal[]
  openBulkWean: (decision: 'engorda' | 'reproductor', ids: Set<string>) => void
  onChangeStage?: (animals: Animal[]) => void
}

const collectCriaIds = (rows: NoursingMotherRow[], motherIds: Set<string>): Set<string> => {
  const ids = new Set<string>()
  for (const r of rows) {
    if (!motherIds.has(r.animal.id)) continue
    for (const c of r.crias) ids.add(c.id)
  }
  return ids
}

export default function TabStageNoursingMothers({
  noursingMothersRows,
  columns,
  animals: _animals,
  openBulkWean,
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
        Madres en lactancia. Destetar destetará a sus crías.
      </p>
      <DataTable
        title={`${animal_stage_config.crias_lactantes.icon} Madres Lactantes`}
        data={noursingMothersRows}
        columns={columns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="unweanDate"
        sessionStorageKey="mg_last_noursing_id"
        selectable
        renderBulkActions={(ids) => {
          const criaIds = collectCriaIds(noursingMothersRows, ids)
          const selectedMothers = noursingMothersRows
            .filter((r) => ids.has(r.animal.id))
            .map((r) => r.animal)
          if (criaIds.size === 0 && selectedMothers.length === 0) return null
          return (
            <>
              {criaIds.size > 0 && (
                <>
                  <Button
                    size="xs"
                    color="warning"
                    onClick={() => openBulkWean('engorda', criaIds)}
                  >
                    {animal_stage_config.engorda.icon} Destetar a Engorda ({criaIds.size})
                  </Button>
                  <Button
                    size="xs"
                    color="error"
                    onClick={() => openBulkWean('reproductor', criaIds)}
                  >
                    {animal_stage_config.reproductor.icon} Destetar a Reproductor ({criaIds.size})
                  </Button>
                </>
              )}
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
          const criaIds = new Set(row.crias.map((c) => c.id))
          return (
            <>
              {criaIds.size > 0 && (
                <>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="warning"
                    onClick={() => openBulkWean('engorda', criaIds)}
                  >
                    {animal_stage_config.engorda.icon} Destetar Engorda
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="error"
                    onClick={() => openBulkWean('reproductor', criaIds)}
                  >
                    {animal_stage_config.reproductor.icon} Destetar Reproductor
                  </Button>
                </>
              )}
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
        emptyMessage="No hay madres en lactancia."
      />
    </div>
  )
}
