import Tabs from '@/components/Tabs'
import { AnimalFilters, AnimalsFilters, type AnimalsFiltersProps } from '../animals-filters'

interface EtapaTab {
  label: string
  badgeCount?: number
  content: React.ReactNode
}

interface Props {
  filters: AnimalFilters
  setFilters: React.Dispatch<React.SetStateAction<AnimalFilters>>
  filteredCount: number
  activeFilterCount: number
  availableTypes: AnimalsFiltersProps['availableTypes']
  availableBreeds: AnimalsFiltersProps['availableBreeds']
  availableStages: AnimalsFiltersProps['availableStages']
  availableGenders: AnimalsFiltersProps['availableGenders']
  formatStatLabel: AnimalsFiltersProps['formatStatLabel']
  tabsTotal: number
  crossTabDuplicatesCount: number
  onShowDuplicates: () => void
  etapasTabs: EtapaTab[]
}

const TabEtapas: React.FC<Props> = ({
  filters,
  setFilters,
  filteredCount,
  activeFilterCount,
  availableTypes,
  availableBreeds,
  availableStages,
  availableGenders,
  formatStatLabel,
  tabsTotal,
  crossTabDuplicatesCount,
  onShowDuplicates,
  etapasTabs,
}) => (
  <div className="mt-2 space-y-3">
    <AnimalsFilters
      filters={filters}
      setFilters={setFilters}
      filteredCount={filteredCount}
      activeFilterCount={activeFilterCount}
      availableTypes={availableTypes}
      availableBreeds={availableBreeds}
      availableStages={availableStages}
      availableGenders={availableGenders}
      formatStatLabel={formatStatLabel}
      tabsTotal={tabsTotal}
    />
    {crossTabDuplicatesCount > 0 && (
      <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between gap-2">
        <span>
          ⚠️ {crossTabDuplicatesCount} animal
          {crossTabDuplicatesCount !== 1 ? 'es' : ''} contado
          {crossTabDuplicatesCount !== 1 ? 's' : ''} en más de una etapa.
        </span>
        <button
          type="button"
          onClick={onShowDuplicates}
          className="px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 cursor-pointer font-medium"
        >
          Ver duplicados
        </button>
      </div>
    )}
    <Tabs tabs={etapasTabs} tabsId="animals-etapas" />
  </div>
)

export default TabEtapas
