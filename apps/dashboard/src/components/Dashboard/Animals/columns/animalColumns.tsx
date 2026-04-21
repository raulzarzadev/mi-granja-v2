import type { ColumnDef } from '@/components/DataTable'
import { Icon } from '@/components/Icon/icon'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { animalAge, computeAnimalEffectiveStage, formatWeight } from '@/lib/animal-utils'
import {
  type Animal,
  animal_gender_config,
  animal_stage_config,
  animal_status_colors,
  animal_status_labels,
  animals_types_labels,
} from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

const ICON_GENDER_SIZE = 4

export const buildAnimalColumns = (): ColumnDef<Animal>[] => [
  {
    key: 'animalNumber',
    label: '#',
    width: '8%',
    sortable: true,
    sortFn: (a, b) =>
      (a.animalNumber || '').localeCompare(b.animalNumber || '', 'es', { numeric: true }),
    render: (row) => (
      <ModalAnimalDetails
        animal={row}
        triggerComponent={
          <span className="font-medium text-gray-900 cursor-pointer hover:text-green-700 transition-colors">
            {row.animalNumber}
          </span>
        }
      />
    ),
  },
  {
    key: 'type',
    label: 'Especie',
    width: '10%',
    sortable: true,
    sortFn: (a, b) =>
      (animals_types_labels[a.type] || '').localeCompare(animals_types_labels[b.type] || '', 'es'),
    render: (row) => <span className="text-gray-700">{animals_types_labels[row.type]}</span>,
  },
  {
    key: 'breed',
    label: 'Raza',
    width: '12%',
    sortable: true,
    sortFn: (a, b) => (a.breed || '').localeCompare(b.breed || '', 'es'),
    render: (row) => <span className="text-gray-600">{row.breed || '—'}</span>,
    className: 'hidden sm:table-cell',
    headerClassName: 'hidden sm:table-cell',
  },
  {
    key: 'gender',
    label: 'Gen',
    width: '5%',
    sortable: true,
    sortFn: (a, b) => a.gender.localeCompare(b.gender, 'es'),
    render: (row) => {
      const cfg = animal_gender_config[row.gender]
      return cfg ? (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor}`}
        >
          <Icon icon={cfg.iconName as 'male' | 'female'} size={ICON_GENDER_SIZE} />
          {cfg.label}
        </span>
      ) : null
    },
  },
  {
    key: 'age',
    label: 'Edad',
    width: '7%',
    sortable: true,
    sortFn: (a, b) => animalAge(a, { format: 'months' }) - animalAge(b, { format: 'months' }),
    render: (row) => {
      const age = animalAge(row, { format: 'short' })
      return <span className="text-gray-600">{age === 'No registrado' ? '—' : age}</span>
    },
  },
  {
    key: 'weight',
    label: 'Peso',
    width: '7%',
    sortable: true,
    sortFn: (a, b) => {
      const wa = typeof a.weight === 'number' ? a.weight : Number(a.weight || 0)
      const wb = typeof b.weight === 'number' ? b.weight : Number(b.weight || 0)
      return wa - wb
    },
    render: (row) => (
      <span className="text-gray-600">{row.weight ? formatWeight(row.weight) : '—'}</span>
    ),
  },
  {
    key: 'status',
    label: 'Estado',
    width: '9%',
    sortable: true,
    sortFn: (a, b) =>
      (animal_status_labels[a.status || 'activo'] || '').localeCompare(
        animal_status_labels[b.status || 'activo'] || '',
        'es',
      ),
    render: (row) => {
      const status = row.status || 'activo'
      return (
        <span className={`text-xs font-medium ${animal_status_colors[status] || ''}`}>
          {animal_status_labels[status]}
        </span>
      )
    },
  },
]

export const buildAllAnimalColumns = (breedingRecords: BreedingRecord[]): ColumnDef<Animal>[] => {
  const stageCol: ColumnDef<Animal> = {
    key: 'stage',
    label: 'Etapa',
    width: '14%',
    sortable: true,
    sortFn: (a, b) =>
      (
        animal_stage_config[computeAnimalEffectiveStage(a, breedingRecords)].label || ''
      ).localeCompare(
        animal_stage_config[computeAnimalEffectiveStage(b, breedingRecords)].label || '',
        'es',
      ),
    render: (row) => {
      const stage = computeAnimalEffectiveStage(row, breedingRecords)
      const cfg = animal_stage_config[stage]
      return (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
        >
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
      )
    },
    className: 'whitespace-nowrap',
  }
  const cols = buildAnimalColumns()
  cols.splice(4, 0, stageCol)
  return cols
}
