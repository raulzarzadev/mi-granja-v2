import AnimalTag from '@/components/AnimalTag'
import type { ColumnDef } from '@/components/DataTable'
import { Icon } from '@/components/Icon/icon'
import { WeanAnimalButton } from '@/components/WeanedAnimal'
import { findAnimalByRef, getWeaningStatusFromDays } from '@/lib/animal-utils'
import { type Animal, animal_gender_config } from '@/types/animals'

export type NoursingMotherRow = {
  animal: Animal
  crias: Animal[]
  unweanDate: Date | null
  daysUntilWean: number | null
}

const ICON_GENDER_SIZE = 4

export const buildNoursingColumns = (animals: Animal[]): ColumnDef<NoursingMotherRow>[] => [
  {
    key: 'number',
    label: '#',
    sortable: true,
    sortFn: (a, b) =>
      (a.animal.animalNumber || '').localeCompare(b.animal.animalNumber || '', 'es', {
        numeric: true,
      }),
    render: (row) => <span className="font-medium text-gray-900">{row.animal.animalNumber}</span>,
    className: 'whitespace-nowrap',
  },
  {
    key: 'gender',
    label: 'Género',
    sortable: true,
    sortFn: (a, b) => (a.animal.gender || '').localeCompare(b.animal.gender || ''),
    render: (row) => {
      const cfg = animal_gender_config[row.animal.gender]
      return cfg ? (
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor}`}
        >
          <Icon icon={cfg.iconName as 'male' | 'female'} size={ICON_GENDER_SIZE} />
          {cfg.label}
        </span>
      ) : null
    },
    className: 'whitespace-nowrap',
  },
  {
    key: 'crias',
    label: 'Crías',
    sortable: true,
    sortFn: (a, b) => {
      const mA = findAnimalByRef(animals, a.crias[0]?.id)?.animalNumber || ''
      const mB = findAnimalByRef(animals, b.crias[0]?.id)?.animalNumber || ''
      return mA.localeCompare(mB, 'es', { numeric: true })
    },
    render: (row) => {
      return row.crias?.length ? (
        <div className="grid min-w-56 gap-2">
          {row.crias.map((cria) => (
            <div
              key={cria.id}
              className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2"
            >
              <AnimalTag animal={cria} showAge />
              <WeanAnimalButton animal={cria} />
            </div>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
    className: 'min-w-64',
  },

  {
    key: 'unweanDate',
    label: 'Destete',
    sortable: true,
    sortFn: (a, b) => {
      if (a.daysUntilWean === null && b.daysUntilWean === null) return 0
      if (a.daysUntilWean === null) return 1
      if (b.daysUntilWean === null) return -1
      return a.daysUntilWean - b.daysUntilWean
    },
    render: (row) => {
      const status = getWeaningStatusFromDays(row.daysUntilWean)

      const dateStr = row.unweanDate
        ? row.unweanDate.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null

      return (
        <span
          title={status.description}
          className={`inline-flex flex-col px-1.5 py-0.5 rounded-md text-xs font-medium ${
            status.tone === 'danger'
              ? 'bg-red-100 text-red-700'
              : status.tone === 'warning'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {dateStr ?? 'Sin fecha'}
          <span className="text-[10px] opacity-70 font-normal">{status.label}</span>
        </span>
      )
    },
    className: 'whitespace-nowrap',
  },
]
