import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'

interface Props {
  title: string
  data: Animal[]
  columns: ColumnDef<Animal>[]
  sessionStorageKey: string
  emptyMessage: string
  /** Si se provee, agrega botón ⇄ Cambiar etapa (individual + bulk). */
  onChangeStage?: (animals: Animal[]) => void
}

const SimpleStageTab: React.FC<Props> = ({
  title,
  data,
  columns,
  sessionStorageKey,
  emptyMessage,
  onChangeStage,
}) => (
  <DataTable
    title={title}
    data={data}
    columns={columns}
    rowKey={(row) => row.id}
    defaultSortKey="animalNumber"
    sessionStorageKey={sessionStorageKey}
    emptyMessage={emptyMessage}
    selectable={!!onChangeStage}
    renderBulkActions={
      onChangeStage
        ? (selectedIds) => {
            const selected = data.filter((a) => selectedIds.has(a.id))
            if (selected.length === 0) return null
            return (
              <Button size="xs" color="primary" onClick={() => onChangeStage(selected)}>
                ⇄ Cambiar etapa ({selected.length})
              </Button>
            )
          }
        : undefined
    }
    onView={(row) => (
      <ModalAnimalDetails
        animal={row}
        triggerComponent={
          <Button size="xs" variant="ghost" color="primary" icon="view">
            Ver
          </Button>
        }
      />
    )}
    renderActions={
      onChangeStage
        ? (row) => (
            <Button
              size="xs"
              variant="ghost"
              color="primary"
              onClick={() => onChangeStage([row])}
              title="Cambiar etapa"
            >
              ⇄ Cambiar etapa
            </Button>
          )
        : undefined
    }
  />
)

export default SimpleStageTab
