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
