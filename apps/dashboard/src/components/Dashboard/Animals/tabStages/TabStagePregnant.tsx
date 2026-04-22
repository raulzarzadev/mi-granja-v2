'use client'

import Button from '@/components/buttons/Button'
import ButtonConfirm from '@/components/buttons/ButtonConfirm'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'
import { animal_stage_config } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'
import type { EnrichedPregnant } from '../columns/partosColumns'

interface Props {
  enrichedPregnantFemales: EnrichedPregnant[]
  columns: ColumnDef<EnrichedPregnant>[]
  onAddBirth: (record: BreedingRecord, femaleId: string) => void
  onEditRecord: (record: BreedingRecord) => void
  onUnconfirmPregnancy: (record: BreedingRecord, femaleId: string) => Promise<void>
  onUpdateAnimal: (id: string, data: Partial<Animal>) => Promise<void>
}

export default function TabStagePregnant({
  enrichedPregnantFemales,
  columns,
  onAddBirth,
  onEditRecord,
  onUnconfirmPregnancy,
  onUpdateAnimal,
}: Props) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Hembras con embarazo confirmado, en espera de parto.
      </p>
      <DataTable
        title={`${animal_stage_config.embarazos.icon} Embarazos`}
        data={enrichedPregnantFemales}
        columns={columns}
        rowKey={(row) => row.animal.id}
        defaultSortKey="expected"
        sessionStorageKey="mg_last_parto_id"
        selectable
        emptyMessage="No hay partos próximos."
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
            {row.record && (
              <Button
                size="xs"
                color="success"
                icon="baby"
                onClick={() => onAddBirth(row.record!, row.animal.id)}
              >
                Parto
              </Button>
            )}
            {row.record && (
              <Button
                size="xs"
                variant="ghost"
                color="primary"
                icon="edit"
                onClick={() => onEditRecord(row.record!)}
              >
                Empadre
              </Button>
            )}
            <ButtonConfirm
              openProps={{ size: 'xs', variant: 'ghost', color: 'error', icon: 'close' }}
              confirmProps={{ color: 'error' }}
              openLabel="Desconfirmar"
              confirmText={`¿Desconfirmar embarazo de ${row.animal.animalNumber}?`}
              confirmLabel="Desconfirmar"
              onConfirm={async () => {
                if (row.record) {
                  await onUnconfirmPregnancy(row.record, row.animal.id)
                } else {
                  await onUpdateAnimal(row.animal.id, { pregnantAt: null, pregnantBy: null })
                }
              }}
            />
          </>
        )}
      />
    </div>
  )
}
