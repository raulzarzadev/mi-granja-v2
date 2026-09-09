import { differenceInCalendarDays } from 'date-fns'
import type { ColumnDef } from '@/components/DataTable'
import { Icon } from '@/components/Icon/icon'
import { WeanAnimalButton } from '@/components/WeanedAnimal'
import { findAnimalByRef } from '@/lib/animal-utils'
import { toDate } from '@/lib/dates'
import { type Animal, animal_gender_config } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export type UnweanedRow = {
  animal: Animal
  motherId: string
  record: BreedingRecord
  weanDate: Date | null
  daysUntilWean: number | null
}

const ICON_GENDER_SIZE = 4

export const buildDestetesColumns = (animals: Animal[]): ColumnDef<UnweanedRow>[] => [
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
    label: 'Gen',
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
    key: 'mother',
    label: 'Madre',
    sortable: true,
    sortFn: (a, b) => {
      const mA = findAnimalByRef(animals, a.motherId)?.animalNumber || ''
      const mB = findAnimalByRef(animals, b.motherId)?.animalNumber || ''
      return mA.localeCompare(mB, 'es', { numeric: true })
    },
    render: (row) => {
      const mother = findAnimalByRef(animals, row.motherId)
      return mother ? (
        <span className="text-gray-700">{mother.animalNumber}</span>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
    className: 'whitespace-nowrap',
  },
  {
    key: 'age',
    label: 'Edad',
    sortable: true,
    sortFn: (a, b) =>
      (a.animal.birthDate ? toDate(a.animal.birthDate).getTime() : 0) -
      (b.animal.birthDate ? toDate(b.animal.birthDate).getTime() : 0),
    render: (row) => {
      if (!row.animal.birthDate) return <span className="text-gray-400">—</span>
      const days = differenceInCalendarDays(new Date(), toDate(row.animal.birthDate))
      const months = Math.floor(days / 30)
      return <span className="text-gray-600">{months > 0 ? `${months}m` : `${days}d`}</span>
    },
    className: 'whitespace-nowrap',
  },
  {
    key: 'weanDate',
    label: 'Destete',
    sortable: true,
    sortFn: (a, b) => {
      if (a.daysUntilWean === null && b.daysUntilWean === null) return 0
      if (a.daysUntilWean === null) return 1
      if (b.daysUntilWean === null) return -1
      return a.daysUntilWean - b.daysUntilWean
    },
    render: (row) => <WeanAnimalButton animal={row.animal} />,
    className: 'whitespace-nowrap',
  },
]
