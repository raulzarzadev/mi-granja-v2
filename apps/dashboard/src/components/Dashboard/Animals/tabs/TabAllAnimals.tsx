import AnimalCard from '@/components/AnimalCard'
import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import { EmojiIcon } from '@/components/Icon/emoji-icons'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'
import FirstAnimalEmptyState from '../FirstAnimalEmptyState'

interface Props {
  filteredAnimals: Animal[]
  allAnimals: Animal[]
  columns: ColumnDef<Animal>[]
  isLoadingAnimals: boolean
  onBulkEdit: (ids: string[], clear: () => void) => void
  onBulkHealth: (ids: string[], clear: () => void) => void
  onBulkSale: (ids: string[], clear: () => void) => void
  duplicateNumbersCount: number
  onShowDuplicateNumbers: () => void
}

const TabAllAnimals: React.FC<Props> = ({
  filteredAnimals,
  allAnimals,
  columns,
  isLoadingAnimals,
  onBulkEdit,
  onBulkHealth,
  onBulkSale,
  duplicateNumbersCount,
  onShowDuplicateNumbers,
}) => {
  if (isLoadingAnimals) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-green-100 border-b-green-700 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="ml-3 text-slate-600">Cargando animales...</span>
      </div>
    )
  }

  if (allAnimals.length === 0) {
    return <FirstAnimalEmptyState />
  }

  return (
    <>
      {duplicateNumbersCount > 0 && (
        <div className="mt-2 p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between gap-2">
          <span>
            <EmojiIcon emoji="⚠️" /> {duplicateNumbersCount} número
            {duplicateNumbersCount !== 1 ? 's' : ''} de animal repetido
            {duplicateNumbersCount !== 1 ? 's' : ''} en más de un registro.
          </span>
          <button
            type="button"
            onClick={onShowDuplicateNumbers}
            className="px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 cursor-pointer font-medium"
          >
            Ver duplicados
          </button>
        </div>
      )}
      <DataTable
        data={filteredAnimals}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSortKey="animalNumber"
        sessionStorageKey="mg_last_animal_id"
        viewModeKey="animal_view_mode"
        selectable
        emptyMessage="No se encontraron animales. Intenta ajustar los filtros."
        renderCard={(row) => (
          <ModalAnimalDetails animal={row} triggerComponent={<AnimalCard animal={row} />} />
        )}
        renderBulkActions={(selectedIds, clearSelection) => (
          <>
            <Button
              size="xs"
              color="primary"
              onClick={() => onBulkEdit(Array.from(selectedIds), clearSelection)}
            >
              Editar
            </Button>
            <Button
              size="xs"
              color="success"
              onClick={() => onBulkHealth(Array.from(selectedIds), clearSelection)}
            >
              Aplicar Registro
            </Button>
            <Button
              size="xs"
              color="warning"
              onClick={() => onBulkSale(Array.from(selectedIds), clearSelection)}
            >
              Crear Venta
            </Button>
          </>
        )}
        renderRowDetails={(row, { onClose }) => (
          <ModalAnimalDetails animal={row} isOpen onClose={onClose} />
        )}
      />
    </>
  )
}

export default TabAllAnimals
