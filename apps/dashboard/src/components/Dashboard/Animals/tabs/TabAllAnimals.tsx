import AnimalCard from '@/components/AnimalCard'
import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'
import { AnimalFilters, AnimalsFilters, type AnimalsFiltersProps } from '../animals-filters'

interface Props {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
  filteredAnimals: Animal[]
  allAnimals: Animal[]
  columns: ColumnDef<Animal>[]
  isLoadingAnimals: boolean
  activeFilterCount: number
  availableTypes: string[]
  availableBreeds: string[]
  availableStages: string[]
  availableGenders: string[]
  formatStatLabel: AnimalsFiltersProps['formatStatLabel']
  onBulkEdit: (ids: string[], clear: () => void) => void
  onBulkHealth: (ids: string[], clear: () => void) => void
  onBulkSale: (ids: string[], clear: () => void) => void
  duplicateNumbersCount: number
  onShowDuplicateNumbers: () => void
}

const TabAllAnimals: React.FC<Props> = ({
  filters,
  setFilters,
  filteredAnimals,
  allAnimals,
  columns,
  isLoadingAnimals,
  activeFilterCount,
  availableTypes,
  availableBreeds,
  availableStages,
  availableGenders,
  formatStatLabel,
  onBulkEdit,
  onBulkHealth,
  onBulkSale,
  duplicateNumbersCount,
  onShowDuplicateNumbers,
}) => (
  <>
    <AnimalsFilters
      filters={filters}
      setFilters={setFilters}
      filteredCount={filteredAnimals.length}
      activeFilterCount={activeFilterCount}
      availableTypes={availableTypes}
      availableBreeds={availableBreeds}
      availableStages={availableStages}
      availableGenders={availableGenders}
      formatStatLabel={formatStatLabel}
    />
    {duplicateNumbersCount > 0 && (
      <div className="mt-2 p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between gap-2">
        <span>
          ⚠️ {duplicateNumbersCount} número
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
    {isLoadingAnimals ? (
      <div className="bg-white rounded-lg shadow flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        <span className="ml-3 text-gray-600">Cargando animales...</span>
      </div>
    ) : (
      <DataTable
        data={filteredAnimals}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSortKey="animalNumber"
        sessionStorageKey="mg_last_animal_id"
        viewModeKey="animal_view_mode"
        selectable
        emptyMessage={
          allAnimals.length === 0
            ? 'No tienes animales registrados. Comienza agregando tu primer animal.'
            : 'No se encontraron animales. Intenta ajustar los filtros.'
        }
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
    )}
  </>
)

export default TabAllAnimals
