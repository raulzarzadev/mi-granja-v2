'use client'

import { useMemo, useState } from 'react'
import AnimalCard from '@/components/AnimalCard'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { useLocalPreference } from '@/hooks/useLocalPreference'
import { Animal } from '@/types/animals'
import AnimalsTable from './AnimalsTable'

interface AnimalListViewProps {
  animals: Animal[]
  /** Mostrar botón "Seleccionar" y acciones masivas */
  enableSelection?: boolean
  /** Componente extra en la barra superior (ej. botones de acciones masivas) */
  selectionActions?: (props: {
    selectedAnimals: string[]
    clearSelection: () => void
    getSelectedAnimalsData: () => Animal[]
  }) => React.ReactNode
  /** Vista inicial */
  defaultView?: 'cards' | 'table'
  /** Mensaje cuando no hay animales */
  emptyMessage?: string
  /** Título dentro del contenedor */
  title?: React.ReactNode
}

const AnimalListView: React.FC<AnimalListViewProps> = ({
  animals,
  enableSelection = false,
  selectionActions,
  defaultView = 'table',
  emptyMessage = 'No se encontraron animales',
  title,
}) => {
  const [viewMode, setViewMode] = useLocalPreference<'cards' | 'table'>(
    'animal_view_mode',
    defaultView,
  )
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useLocalPreference('animal_page_size', 10)

  const filtered = animals

  // Reset page cuando cambian filtros o búsqueda
  const totalPages = Math.ceil(filtered.length / pageSize)
  const safePage = Math.min(page, Math.max(totalPages - 1, 0))
  if (safePage !== page) setPage(safePage)

  const paginated = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  )

  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals((prev) =>
      prev.includes(animalId) ? prev.filter((id) => id !== animalId) : [...prev, animalId],
    )
  }

  const selectAllVisible = () => setSelectedAnimals(filtered.map((a) => a.id))
  const clearSelection = () => {
    setSelectedAnimals([])
    setIsSelectionMode(false)
  }
  const getSelectedAnimalsData = () => filtered.filter((a) => selectedAnimals.includes(a.id))

  return (
    <div>
      {/* Lista */}
      <div>
        {title && (
          <div className="px-2 py-2">
            {typeof title === 'string' ? <h3 className="text-lg font-semibold">{title}</h3> : title}
          </div>
        )}
        {/* Toolbar: selección + paginación + toggle vista */}
        {filtered.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
            {/* Izquierda: selección o conteo */}
            <div className="flex items-center gap-2">
              {enableSelection && (
                <>
                  {!isSelectionMode ? (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Seleccionar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={selectAllVisible}
                        className="text-xs text-green-600 hover:text-green-800 transition-colors"
                      >
                        Todos ({filtered.length})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={clearSelection}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {isSelectionMode && selectedAnimals.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs text-gray-500">
                        {selectedAnimals.length} seleccionados
                      </span>
                      {selectionActions?.({
                        selectedAnimals,
                        clearSelection,
                        getSelectedAnimalsData,
                      })}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Centro-derecha: paginación + pageSize + toggle vista */}
            <div className="flex items-center gap-3">
              {/* PageSize */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
              </select>

              {/* Rango + nav */}
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} de{' '}
                <span className="font-semibold text-gray-700">{filtered.length}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Anterior"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Siguiente"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Toggle cards/tabla */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Vista de tarjetas"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Vista de tabla"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-2 md:p-6 md:pt-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🐄</span>
              <p className="text-gray-500">{emptyMessage}</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-6 gap-2">
              {paginated.map((animal) => (
                <div key={animal.id} className="relative">
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedAnimals.includes(animal.id)}
                        onChange={() => toggleAnimalSelection(animal.id)}
                        className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>
                  )}
                  {isSelectionMode ? (
                    <div
                      onClick={() => toggleAnimalSelection(animal.id)}
                      className={`cursor-pointer transition-all ${
                        selectedAnimals.includes(animal.id)
                          ? 'ring-2 ring-blue-500 ring-offset-2'
                          : 'hover:shadow-lg'
                      }`}
                    >
                      <AnimalCard animal={animal} />
                    </div>
                  ) : (
                    <ModalAnimalDetails
                      animal={animal}
                      triggerComponent={<AnimalCard animal={animal} />}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <AnimalsTable
              animals={paginated}
              isSelectionMode={isSelectionMode}
              selectedAnimals={selectedAnimals}
              onToggleSelection={toggleAnimalSelection}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimalListView
