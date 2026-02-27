'use client'

import { useState } from 'react'
import { Modal } from '@/components/Modal'
import AnimalDetailView from '@/components/AnimalDetailView'
import { animalAge } from '@/lib/animal-utils'
import {
  Animal,
  AnimalStatus,
  animal_stage_colors,
  animal_status_colors,
  animal_status_labels,
  animals_stages_labels,
  animals_types_labels,
  gender_icon,
} from '@/types/animals'

type SortField = 'animalNumber' | 'type' | 'breed' | 'gender' | 'stage' | 'age' | 'weight' | 'status'
type SortDirection = 'asc' | 'desc'

interface AnimalsTableProps {
  animals: Animal[]
  isSelectionMode: boolean
  selectedAnimals: string[]
  onToggleSelection: (animalId: string) => void
}

const SortIcon = ({ direction }: { direction: SortDirection | null }) => {
  if (!direction) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3 text-gray-400"
      >
        <path
          fillRule="evenodd"
          d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-3 h-3 text-green-600"
    >
      {direction === 'asc' ? (
        <path
          fillRule="evenodd"
          d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      )}
    </svg>
  )
}

const AnimalsTable = ({
  animals,
  isSelectionMode,
  selectedAnimals,
  onToggleSelection,
}: AnimalsTableProps) => {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedAnimals = (() => {
    if (!sortField) return animals

    return [...animals].sort((a, b) => {
      let cmp = 0

      switch (sortField) {
        case 'animalNumber': {
          const idA = a.animalNumber || (a as any).earring || ''
          const idB = b.animalNumber || (b as any).earring || ''
          cmp = idA.localeCompare(idB, 'es', { numeric: true })
          break
        }
        case 'type':
          cmp = (animals_types_labels[a.type] || '').localeCompare(
            animals_types_labels[b.type] || '',
            'es',
          )
          break
        case 'breed':
          cmp = (a.breed || '').localeCompare(b.breed || '', 'es')
          break
        case 'gender':
          cmp = a.gender.localeCompare(b.gender, 'es')
          break
        case 'stage':
          cmp = (animals_stages_labels[a.stage] || '').localeCompare(
            animals_stages_labels[b.stage] || '',
            'es',
          )
          break
        case 'age':
          cmp = animalAge(a, { format: 'months' }) - animalAge(b, { format: 'months' })
          break
        case 'weight': {
          const wa = typeof a.weight === 'number' ? a.weight : Number.parseFloat(String(a.weight || '0'))
          const wb = typeof b.weight === 'number' ? b.weight : Number.parseFloat(String(b.weight || '0'))
          cmp = (wa || 0) - (wb || 0)
          break
        }
        case 'status':
          cmp = (animal_status_labels[a.status || 'activo'] || '').localeCompare(
            animal_status_labels[b.status || 'activo'] || '',
            'es',
          )
          break
      }

      return sortDirection === 'asc' ? cmp : -cmp
    })
  })()

  const handleRowClick = (animal: Animal) => {
    if (isSelectionMode) {
      onToggleSelection(animal.id)
    } else {
      setSelectedAnimal(animal)
    }
  }

  return (
    <>
      <div className="overflow-x-auto -mx-2 md:mx-0">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {isSelectionMode && <th className="w-8 px-2 py-2" />}
              <th
                onClick={() => handleSort('animalNumber')}
                className="w-16 px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  #
                  <SortIcon direction={sortField === 'animalNumber' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('type')}
                className="px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Tipo
                  <SortIcon direction={sortField === 'type' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('breed')}
                className="hidden sm:table-cell px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Raza
                  <SortIcon direction={sortField === 'breed' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('gender')}
                className="w-10 px-1 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors text-center"
              >
                <span className="inline-flex items-center gap-0.5">
                  <span className="hidden sm:inline">Gen</span>
                  <span className="sm:hidden">G</span>
                  <SortIcon direction={sortField === 'gender' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('stage')}
                className="px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Etapa
                  <SortIcon direction={sortField === 'stage' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('age')}
                className="hidden sm:table-cell px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Edad
                  <SortIcon direction={sortField === 'age' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('weight')}
                className="hidden md:table-cell px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Peso
                  <SortIcon direction={sortField === 'weight' ? sortDirection : null} />
                </span>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-2 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
              >
                <span className="inline-flex items-center gap-0.5">
                  Estado
                  <SortIcon direction={sortField === 'status' ? sortDirection : null} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAnimals.map((animal) => {
              const isSelected = selectedAnimals.includes(animal.id)
              const status = animal.status || 'activo'
              const weight =
                animal.weight != null && animal.weight !== '' ? `${animal.weight}` : '—'

              return (
                <tr
                  key={animal.id}
                  onClick={() => handleRowClick(animal)}
                  className={`border-t border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {isSelectionMode && (
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(animal.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {animal.animalNumber || (animal as any).earring || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {animals_types_labels[animal.type]}
                  </td>
                  <td className="hidden sm:table-cell px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {animal.breed || '—'}
                  </td>
                  <td className="px-1 py-1.5 text-sm text-center whitespace-nowrap">
                    {gender_icon[animal.gender]}
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${animal_stage_colors[animal.stage]}`}
                    >
                      {animals_stages_labels[animal.stage]}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {animalAge(animal, { format: 'short' })}
                  </td>
                  <td className="hidden md:table-cell px-2 py-1.5 text-sm text-gray-700 whitespace-nowrap">
                    {weight} kg
                  </td>
                  <td className="px-2 py-1.5 text-sm whitespace-nowrap">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${animal_status_colors[status as AnimalStatus]}`}
                    >
                      {animal_status_labels[status as AnimalStatus]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de detalles del animal */}
      <Modal
        isOpen={!!selectedAnimal}
        onClose={() => setSelectedAnimal(null)}
        title="Detalles del Animal"
        size="lg"
      >
        {selectedAnimal && <AnimalDetailView animal={selectedAnimal} />}
      </Modal>
    </>
  )
}

export default AnimalsTable
