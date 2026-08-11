'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import { useBilling } from '@/hooks/useBilling'
import { useFarmCRUD } from '@/hooks/useFarmCRUD'
import { useModal } from '@/hooks/useModal'
import type {
  Farm,
  FarmActivityType,
  FarmAnimalSpecies,
  FarmCropType,
  FarmOtherActivity,
  FarmProductionProfile,
  FarmProductionPurpose,
} from '@/types/farm'
import Button from './buttons/Button'
import { Modal } from './Modal'

type ModalCreateFarmProps = {
  open?: boolean
  onClose?: () => void
  showTrigger?: boolean
  onCreated?: (farm: Farm) => void
}

type Choice<T extends string> = {
  value: T
  label: string
  icon: string
  description?: string
}

const COUNTRIES = [
  'México',
  'Argentina',
  'Bolivia',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Guatemala',
  'Honduras',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'República Dominicana',
  'Uruguay',
  'Otro país',
]

const ACTIVITY_OPTIONS: Choice<FarmActivityType>[] = [
  {
    value: 'livestock',
    label: 'Ganadería',
    icon: '🐄',
    description: 'Animales, reproducción o producción',
  },
  {
    value: 'crops',
    label: 'Cultivos',
    icon: '🌱',
    description: 'Siembra, cosecha y tareas de campo',
  },
  {
    value: 'mixed',
    label: 'Mixta',
    icon: '🚜',
    description: 'Animales y cultivos en la misma granja',
  },
  {
    value: 'other',
    label: 'Otro giro',
    icon: '🌾',
    description: 'Otra actividad rural o agropecuaria',
  },
]

const PURPOSE_OPTIONS: Choice<FarmProductionPurpose>[] = [
  { value: 'breeding', label: 'Reproducción', icon: '🐣' },
  { value: 'meat', label: 'Carne / engorda', icon: '🥩' },
  { value: 'milk', label: 'Leche', icon: '🥛' },
  { value: 'eggs', label: 'Huevos', icon: '🥚' },
  { value: 'fiber', label: 'Lana / fibra', icon: '🧶' },
  { value: 'other', label: 'Otro', icon: '＋' },
]

const SPECIES_OPTIONS: Choice<FarmAnimalSpecies>[] = [
  { value: 'vaca', label: 'Bovinos', icon: '🐄' },
  { value: 'oveja', label: 'Ovinos', icon: '🐑' },
  { value: 'cabra', label: 'Caprinos', icon: '🐐' },
  { value: 'cerdo', label: 'Porcinos', icon: '🐖' },
  { value: 'gallina', label: 'Aves', icon: '🐓' },
  { value: 'equino', label: 'Equinos', icon: '🐎' },
  { value: 'otro', label: 'Otros', icon: '🐾' },
]

const CROP_OPTIONS: Choice<FarmCropType>[] = [
  { value: 'grains', label: 'Granos / cereales', icon: '🌾' },
  { value: 'vegetables', label: 'Hortalizas', icon: '🥬' },
  { value: 'fruit', label: 'Frutas', icon: '🍎' },
  { value: 'forage', label: 'Forrajes / pasturas', icon: '🌿' },
  { value: 'other', label: 'Otros cultivos', icon: '🪴' },
]

const OTHER_ACTIVITY_OPTIONS: Choice<FarmOtherActivity>[] = [
  { value: 'beekeeping', label: 'Apicultura', icon: '🐝' },
  { value: 'aquaculture', label: 'Acuicultura', icon: '🐟' },
  { value: 'veterinary', label: 'Servicios veterinarios', icon: '🩺' },
  { value: 'agrotourism', label: 'Agroturismo', icon: '🏡' },
  { value: 'other', label: 'Otro', icon: '✨' },
]

const initialFormData = () => ({
  name: '',
  country: 'México',
  activityType: null as FarmActivityType | null,
  productionPurposes: [] as FarmProductionPurpose[],
  animalSpecies: [] as FarmAnimalSpecies[],
  cropTypes: [] as FarmCropType[],
  otherActivity: null as FarmOtherActivity | null,
})

function MultiChoiceGrid<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: Choice<T>[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const isSelected = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(option.value)}
            className={`relative min-h-14 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
              isSelected
                ? 'border-green-600 bg-green-50 text-green-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50/50'
            }`}
          >
            <span className="mr-2" aria-hidden="true">
              {option.icon}
            </span>
            {option.label}
            {isSelected && (
              <span className="absolute right-2 top-2 text-green-700" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const ModalCreateFarm = ({
  open,
  onClose,
  showTrigger = true,
  onCreated,
}: ModalCreateFarmProps) => {
  const modal = useModal()
  const isOpen = open ?? modal.isOpen
  const openModal = modal.openModal
  const closeModal = onClose ?? modal.closeModal
  const { createFarm } = useFarmCRUD()
  const { canCreateFarm, usage } = useBilling()
  const { user } = useSelector((state: RootState) => state.auth)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialFormData)

  const resetForm = () => {
    setStep(1)
    setError(null)
    setFormData(initialFormData())
  }

  const handleClose = () => {
    if (isLoading) return
    resetForm()
    closeModal()
  }

  const selectActivity = (activityType: FarmActivityType) => {
    setFormData((current) => ({ ...current, activityType }))
    setError(null)
    setStep(3)
  }

  const toggleValue = <T extends string>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

  const needsLivestock = formData.activityType === 'livestock' || formData.activityType === 'mixed'
  const needsCrops = formData.activityType === 'crops' || formData.activityType === 'mixed'
  const detailsComplete = Boolean(
    formData.activityType &&
      (!needsLivestock ||
        (formData.productionPurposes.length > 0 && formData.animalSpecies.length > 0)) &&
      (!needsCrops || formData.cropTypes.length > 0) &&
      (formData.activityType !== 'other' || formData.otherActivity),
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!formData.name.trim() || !formData.country || !detailsComplete) return

    setIsLoading(true)
    setError(null)
    try {
      const productionProfile: FarmProductionProfile = {
        activityType: formData.activityType!,
        ...(needsLivestock
          ? {
              productionPurposes: formData.productionPurposes,
              animalSpecies: formData.animalSpecies,
            }
          : {}),
        ...(needsCrops ? { cropTypes: formData.cropTypes } : {}),
        ...(formData.activityType === 'other' && formData.otherActivity
          ? { otherActivity: formData.otherActivity }
          : {}),
      }
      const farmData: Omit<
        Farm,
        'id' | 'ownerId' | 'areas' | 'collaborators' | 'createdAt' | 'updatedAt'
      > = {
        name: formData.name.trim(),
        description: '',
        location: { country: formData.country },
        productionProfile,
      }

      const created = await createFarm(farmData)
      onCreated?.(created)
      resetForm()
      closeModal()
    } catch (submitError) {
      console.error('Error creating farm:', submitError)
      setError('No pudimos crear la granja. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasPlaces = canCreateFarm()

  return (
    <>
      {showTrigger && (
        <Button size="md" variant="filled" color="success" icon="add" onClick={openModal}>
          Crear Mi Granja
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Configura tu granja"
        size="lg"
        closeOnOverlayClick={!isLoading}
        closeOnEscape={!isLoading}
        contentClassName="sm:p-5"
      >
        {!hasPlaces ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <span className="text-4xl" aria-hidden="true">
                🚜
              </span>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                Alcanzaste el límite de animales
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Tu plan permite <strong>{usage?.animalLimit ?? 0} animales</strong> y actualmente
                tienes <strong>{usage?.animalCount ?? 0}</strong>.
              </p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="mb-1 font-medium">¿Necesitas más capacidad?</p>
              <a
                href={`mailto:hola@migranja.app?subject=${encodeURIComponent('Cambiar mi plan')}&body=${encodeURIComponent(
                  `Hola, necesito cambiar mi plan.\n\nEmail: ${user?.email || '—'}\nID: ${user?.id || '—'}\nAnimales: ${usage?.animalCount ?? 0}\n`,
                )}`}
                className="font-semibold underline hover:text-blue-900"
              >
                Escríbenos a hola@migranja.app
              </a>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" color="neutral" size="md" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
            <div className="mb-5" aria-label={`Paso ${step} de 3`}>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Paso {step} de 3</span>
                <span>
                  {step === 1 ? 'Datos básicos' : step === 2 ? 'Tipo de granja' : 'Tu operación'}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-600 transition-[width] motion-reduce:transition-none"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex-1">
              {step === 1 && (
                <section aria-labelledby="farm-basics-title" className="space-y-5">
                  <div>
                    <h3 id="farm-basics-title" className="text-xl font-bold text-slate-900">
                      Empecemos por lo básico
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Usaremos estos datos para preparar tu espacio.
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="farmName"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Nombre de la granja
                    </label>
                    <input
                      id="farmName"
                      type="text"
                      required
                      autoFocus
                      autoComplete="organization"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Ej. Rancho San José"
                      className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-200"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="farmCountry"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      País
                    </label>
                    <select
                      id="farmCountry"
                      required
                      value={formData.country}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, country: event.target.value }))
                      }
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition-colors focus:border-green-600 focus:ring-2 focus:ring-green-200"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section aria-labelledby="farm-activity-title">
                  <h3 id="farm-activity-title" className="text-xl font-bold text-slate-900">
                    ¿Qué tipo de granja es?
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Toca la opción que mejor la describa.
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ACTIVITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={formData.activityType === option.value}
                        onClick={() => selectActivity(option.value)}
                        className="min-h-20 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-green-400 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                      >
                        <span className="flex items-start gap-3">
                          <span className="text-2xl" aria-hidden="true">
                            {option.icon}
                          </span>
                          <span>
                            <span className="block font-bold text-slate-900">{option.label}</span>
                            <span className="mt-0.5 block text-sm leading-5 text-slate-600">
                              {option.description}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 3 && (
                <section aria-labelledby="farm-profile-title" className="space-y-5">
                  <div>
                    <h3 id="farm-profile-title" className="text-xl font-bold text-slate-900">
                      Personalicemos tu experiencia
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Puedes elegir más de una opción.
                    </p>
                  </div>

                  {needsLivestock && (
                    <>
                      <fieldset>
                        <legend className="mb-2 text-sm font-semibold text-slate-800">
                          ¿Cuál es tu objetivo principal?
                        </legend>
                        <MultiChoiceGrid
                          options={PURPOSE_OPTIONS}
                          selected={formData.productionPurposes}
                          onToggle={(value) =>
                            setFormData((current) => ({
                              ...current,
                              productionPurposes: toggleValue(current.productionPurposes, value),
                            }))
                          }
                        />
                      </fieldset>
                      <fieldset>
                        <legend className="mb-2 text-sm font-semibold text-slate-800">
                          ¿Qué especies manejas?
                        </legend>
                        <MultiChoiceGrid
                          options={SPECIES_OPTIONS}
                          selected={formData.animalSpecies}
                          onToggle={(value) =>
                            setFormData((current) => ({
                              ...current,
                              animalSpecies: toggleValue(current.animalSpecies, value),
                            }))
                          }
                        />
                      </fieldset>
                    </>
                  )}

                  {needsCrops && (
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-slate-800">
                        ¿Qué cultivos manejas?
                      </legend>
                      <MultiChoiceGrid
                        options={CROP_OPTIONS}
                        selected={formData.cropTypes}
                        onToggle={(value) =>
                          setFormData((current) => ({
                            ...current,
                            cropTypes: toggleValue(current.cropTypes, value),
                          }))
                        }
                      />
                    </fieldset>
                  )}

                  {formData.activityType === 'other' && (
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold text-slate-800">
                        ¿Cuál es tu actividad?
                      </legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {OTHER_ACTIVITY_OPTIONS.map((option) => {
                          const isSelected = formData.otherActivity === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setFormData((current) => ({
                                  ...current,
                                  otherActivity: option.value,
                                }))
                              }
                              className={`min-h-14 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 ${
                                isSelected
                                  ? 'border-green-600 bg-green-50 text-green-900'
                                  : 'border-slate-200 text-slate-700 hover:border-green-300 hover:bg-green-50/50'
                              }`}
                            >
                              <span className="mr-2" aria-hidden="true">
                                {option.icon}
                              </span>
                              {option.label}
                              {isSelected && <span className="float-right text-green-700">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>
                  )}

                  {(formData.activityType === 'crops' || formData.activityType === 'other') && (
                    <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-5 text-sky-900">
                      Hoy puedes usar registros y recordatorios generales. Guardaremos tus
                      respuestas para adaptar las próximas herramientas a tu actividad.
                    </p>
                  )}
                </section>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] pt-4 sm:flex-row sm:justify-between">
              {step === 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="md"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="md"
                  onClick={() => setStep(step === 3 ? 2 : 1)}
                  disabled={isLoading}
                  className="min-h-11"
                >
                  Atrás
                </Button>
              )}

              {step === 1 && (
                <Button
                  type="button"
                  variant="filled"
                  color="success"
                  size="md"
                  disabled={!formData.name.trim() || !formData.country}
                  onClick={() => setStep(2)}
                  className="min-h-11"
                >
                  Continuar
                </Button>
              )}

              {step === 2 && (
                <p className="self-center text-center text-xs text-slate-500 sm:text-right">
                  Selecciona una opción para continuar
                </p>
              )}

              {step === 3 && (
                <Button
                  type="submit"
                  variant="filled"
                  color="success"
                  size="md"
                  disabled={isLoading || !detailsComplete}
                  className="min-h-11"
                >
                  {isLoading ? 'Creando…' : 'Crear mi granja'}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

export default ModalCreateFarm
