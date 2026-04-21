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
}

const SimpleStageTab: React.FC<Props> = ({
  title,
  data,
  columns,
  sessionStorageKey,
  emptyMessage,
}) => (
  <DataTable
    title={title}
    data={data}
    columns={columns}
    rowKey={(row) => row.id}
    defaultSortKey="animalNumber"
    sessionStorageKey={sessionStorageKey}
    emptyMessage={emptyMessage}
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
  />
)

export default SimpleStageTab
