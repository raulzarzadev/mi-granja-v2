import AnimalCard from '@/components/AnimalCard'
import Button from '@/components/buttons/Button'
import DataTable, { type ColumnDef } from '@/components/DataTable'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import ModalAnimalForm from '@/components/ModalAnimalForm'
import {
  type Animal,
  type AnimalStage,
  animal_stage_config,
  animal_stage_descriptions,
} from '@/types/animals'

const ONBOARDING_STAGES: AnimalStage[] = ['cria', 'juvenil', 'engorda', 'reproductor']

interface Props {
  filteredAnimals: Animal[]
  allAnimals: Animal[]
  columns: ColumnDef<Animal>[]
  isLoadingAnimals: boolean
  onBulkEdit: (ids: string[], clear: () => void) => void
  onBulkHealth: (ids: string[], clear: () => void) => void
  onBulkSale: (ids: string[], clear: () => void) => void
  duplicateNumbersCount: number
  onShowDuplicateNumbers: () => void
}

const TabAllAnimals: React.FC<Props> = ({
  filteredAnimals,
  allAnimals,
  columns,
  isLoadingAnimals,
  onBulkEdit,
  onBulkHealth,
  onBulkSale,
  duplicateNumbersCount,
  onShowDuplicateNumbers,
}) => {
  if (isLoadingAnimals) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-green-100 border-b-green-700 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="ml-3 text-slate-600">Cargando animales...</span>
      </div>
    )
  }

  if (allAnimals.length === 0) {
    return (
      <section
        aria-labelledby="first-animal-title"
        className="relative mt-4 overflow-hidden rounded-[2rem] border border-green-200 bg-[#fbfdf8] px-5 py-8 shadow-sm sm:px-8 sm:py-10 lg:px-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-green-100/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full border-[28px] border-amber-100/60"
        />

        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700 text-3xl text-white shadow-[0_8px_0_#bbf7d0] sm:h-20 sm:w-20 sm:text-4xl">
              <span aria-hidden="true">🐄</span>
            </div>
            <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-green-800">
              Tu inventario comienza aquí
            </p>
            <h2
              id="first-animal-title"
              className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Agrega tu primer animal
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Registra sus datos básicos y Mi Granja te ayudará a seguir su crecimiento,
              reproducción, salud y movimientos desde un solo lugar.
            </p>

            <div className="mt-7 flex justify-center">
              <ModalAnimalForm
                formVariant="simple"
                openLabel={
                  <span className="flex items-center justify-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-2xl"
                    >
                      +
                    </span>
                    <span className="text-left">
                      <span className="block text-base font-bold sm:text-lg">
                        Registrar mi primer animal
                      </span>
                      <span className="block text-xs font-medium text-green-50">
                        El formulario se abre aquí mismo
                      </span>
                    </span>
                  </span>
                }
                triggerClassName="group min-h-16 w-full max-w-sm rounded-2xl bg-green-700 px-5 py-3 text-white shadow-[0_6px_0_#14532d] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-[0_8px_0_#14532d] active:translate-y-1 active:shadow-[0_2px_0_#14532d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </div>
          </div>

          <div className="mt-12 border-t border-green-200/80 pt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-green-800">
                  Etapas del animal
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Del nacimiento a su destino productivo
                </h3>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                La etapa organiza tu inventario y puede actualizarse conforme cambia cada animal.
              </p>
            </div>

            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ONBOARDING_STAGES.map((stage, index) => {
                const config = animal_stage_config[stage]
                return (
                  <li
                    key={stage}
                    className="relative rounded-2xl border border-slate-200 bg-white/90 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${config.color}`}
                      >
                        {config.icon}
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Etapa {index + 1}
                        </p>
                        <p className="mt-0.5 font-bold text-slate-900">{config.label}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-600">
                      {animal_stage_descriptions[stage].description}
                    </p>
                  </li>
                )
              })}
            </ol>

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-green-900 px-4 py-3.5 text-green-50 sm:px-5">
              <span aria-hidden="true" className="mt-0.5 text-xl">
                ♻️
              </span>
              <p className="text-sm leading-6">
                <strong className="font-bold text-white">En reproducción:</strong> las hembras
                también pasan por empadre, gestación y lactancia. Mi Granja relaciona esas etapas
                con sus registros reproductivos.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
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
      <DataTable
        data={filteredAnimals}
        columns={columns}
        rowKey={(row) => row.id}
        defaultSortKey="animalNumber"
        sessionStorageKey="mg_last_animal_id"
        viewModeKey="animal_view_mode"
        selectable
        emptyMessage="No se encontraron animales. Intenta ajustar los filtros."
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
        renderRowDetails={(row, { onClose }) => (
          <ModalAnimalDetails animal={row} isOpen onClose={onClose} />
        )}
      />
    </>
  )
}

export default TabAllAnimals
