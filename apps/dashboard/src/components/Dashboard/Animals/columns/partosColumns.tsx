import type { ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import type { Animal } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export type EnrichedPregnant = {
  animal: Animal
  record?: BreedingRecord | null
  info?: {
    femaleId: string
    expectedBirthDate?: Date | null
    pregnancyConfirmedDate?: Date | null
    actualBirthDate?: Date | null
    offspring?: string[]
  }
  father?: Animal | null
  expected: Date | null
  daysLeft: number | null
}

export const buildPartosColumns = (): ColumnDef<EnrichedPregnant>[] => [
  {
    key: 'number',
    label: 'Hembra',
    sortable: true,
    sortFn: (a, b) =>
      (a.animal.animalNumber || '').localeCompare(b.animal.animalNumber || '', 'es', {
        numeric: true,
      }),
    render: (row) => (
      <ModalAnimalDetails
        animal={row.animal}
        triggerComponent={
          <span className="font-medium text-gray-900 cursor-pointer hover:text-green-700 transition-colors">
            {row.animal.animalNumber}
          </span>
        }
      />
    ),
    className: 'whitespace-nowrap',
  },
  {
    key: 'father',
    label: 'Macho',
    sortable: true,
    sortFn: (a, b) => {
      const aLabel = a.father?.animalNumber || a.animal.pregnantBy || ''
      const bLabel = b.father?.animalNumber || b.animal.pregnantBy || ''
      return aLabel.localeCompare(bLabel, 'es', { numeric: true })
    },
    render: (row) => {
      if (row.father) {
        return (
          <ModalAnimalDetails
            animal={row.father}
            triggerComponent={
              <span className="text-gray-700 cursor-pointer hover:text-green-700 transition-colors">
                {row.father.animalNumber}
              </span>
            }
          />
        )
      }
      if (row.animal.pregnantBy) {
        return <span className="text-gray-600">{row.animal.pregnantBy}</span>
      }
      return <span className="text-gray-400 italic">Sin macho</span>
    },
    className: 'whitespace-nowrap',
  },
  {
    key: 'empadre',
    label: 'Empadre',
    sortable: true,
    sortFn: (a, b) =>
      (a.record?.breedingId || '').localeCompare(b.record?.breedingId || '', 'es', {
        numeric: true,
      }),
    render: (row) => (
      <span className={row.record ? 'text-gray-600' : 'text-gray-400 italic'}>
        {row.record?.breedingId || 'Sin empadre'}
      </span>
    ),
    className: 'whitespace-nowrap',
  },
  {
    key: 'expected',
    label: 'Parto esperado',
    sortable: true,
    sortFn: (a, b) => {
      if (a.daysLeft === null && b.daysLeft === null) return 0
      if (a.daysLeft === null) return 1
      if (b.daysLeft === null) return -1
      return a.daysLeft - b.daysLeft
    },
    render: (row) => (
      <span className="text-gray-600">
        {row.expected ? row.expected.toLocaleDateString('es-MX') : '—'}
      </span>
    ),
    className: 'whitespace-nowrap',
  },
  {
    key: 'status',
    label: 'Estado',
    sortable: true,
    sortFn: (a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
    render: (row) => {
      const badgeColor =
        row.daysLeft !== null && row.daysLeft < 0
          ? 'bg-red-100 text-red-700'
          : row.daysLeft !== null && row.daysLeft <= 15
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-green-100 text-green-700'
      return (
        <span
          className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
        >
          {row.daysLeft !== null
            ? row.daysLeft === 0
              ? 'Hoy'
              : row.daysLeft > 0
                ? `En ${row.daysLeft}d`
                : `Atrasado ${Math.abs(row.daysLeft)}d`
            : '—'}
        </span>
      )
    },
    className: 'whitespace-nowrap',
  },
]
