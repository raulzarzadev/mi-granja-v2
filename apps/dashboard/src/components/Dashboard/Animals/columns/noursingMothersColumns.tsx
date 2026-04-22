import type { ColumnDef } from '@/components/DataTable'
import { Icon } from '@/components/Icon/icon'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { findAnimalByRef } from '@/lib/animal-utils'
import { type Animal, animal_gender_config } from '@/types/animals'
import AnimalBadge from '@/components/AnimalBadges'
import AnimalTag from '@/components/AnimalTag'

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
    key: 'gender',
    label: 'Genero',
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
    label: 'Crias',
    sortable: true,
    sortFn: (a, b) => {
      const mA = findAnimalByRef(animals, a.crias[0]?.id)?.animalNumber || ''
      const mB = findAnimalByRef(animals, b.crias[0]?.id)?.animalNumber || ''
      return mA.localeCompare(mB, 'es', { numeric: true })
    },
    render: (row) => {
      // Show crias AnimalBadge
      //
      const motherOffspring = animals.filter(
        (a) =>
          //is offspring
          a.motherId === row.animal.id &&
          // is alive
          a.status === 'activo' &&
          // is unweaned
          (!a.weanedAt || !a.isWeaned),
      )

      return motherOffspring?.length ? (
        <div>
          <span className="text-gray-700">{row.animal.animalNumber}</span>
          <div className="flex gap-1">
            {motherOffspring?.map((cria) => (
              <AnimalTag animal={cria} key={cria.id} />
            ))}
          </div>
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      )
    },
    className: 'whitespace-nowrap',
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
      const isOverdue = row.daysUntilWean !== null && row.daysUntilWean < 0
      const isSoon = row.daysUntilWean !== null && row.daysUntilWean >= 0 && row.daysUntilWean <= 7
      return (
        <span
          className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${
            isOverdue
              ? 'bg-red-100 text-red-700'
              : isSoon
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.daysUntilWean !== null
            ? row.daysUntilWean === 0
              ? 'Hoy'
              : row.daysUntilWean > 0
                ? `En ${row.daysUntilWean}d`
                : `Hace ${Math.abs(row.daysUntilWean)}d`
            : 'Sin fecha'}
        </span>
      )
    },
    className: 'whitespace-nowrap',
  },
]
