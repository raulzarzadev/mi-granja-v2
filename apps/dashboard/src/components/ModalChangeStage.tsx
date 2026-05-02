'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalTag from '@/components/AnimalTag'
import Button from '@/components/buttons/Button'
import AnimalSelector from '@/components/inputs/AnimalSelector'
import DateTimeInput from '@/components/inputs/DateTimeInput'
import { Modal } from '@/components/Modal'
import type { RootState } from '@/features/store'
import {
  applyChangeStage,
  type ChangeStagePayload,
  getApplicableTargets,
  getFamilyContext,
  predictFinalStage,
  TARGET_ICON,
  TARGET_LABEL,
  type TargetKey,
} from '@/lib/changeStage'
import {
  type Animal,
  animal_stage_config,
  animal_status_icons,
  animal_status_labels,
} from '@/types/animals'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Animales a los que se aplicará el cambio. len 1 = individual, len > 1 = bulk. */
  animals: Animal[]
  /** Lista completa de animales (para AnimalSelector y cómputo familiar). */
  allAnimals: Animal[]
  /** Callback opcional al completar (para limpiar selección bulk). */
  onApplied?: () => void
  /** Para hembras embarazadas (computedStage === 'embarazos'): handler de desconfirmar */
  onUnconfirmPregnancy?: (animal: Animal) => void
  /** Para hembras embarazadas: handler de registrar parto */
  onRegisterBirth?: (animal: Animal) => void
}

const ModalChangeStage: React.FC<Props> = ({
  isOpen,
  onClose,
  animals,
  allAnimals,
  onApplied,
  onUnconfirmPregnancy,
  onRegisterBirth,
}) => {
  const user = useSelector((s: RootState) => s.auth.user)
  const currentFarm = useSelector((s: RootState) => s.farm.currentFarm)

  const [target, setTarget] = useState<TargetKey | null>(null)
  const [date, setDate] = useState<Date>(new Date())
  const [maleId, setMaleId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [siblingWeanIds, setSiblingWeanIds] = useState<Set<string>>(new Set())
  const [motherCriaWeanIds, setMotherCriaWeanIds] = useState<Set<string>>(new Set())
  const [motherCriaTarget, setMotherCriaTarget] = useState<'engorda' | 'reproductor'>('engorda')
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isIndividual = animals.length === 1
  const single = isIndividual ? animals[0] : null

  const family = useMemo(
    () => (single ? getFamilyContext(single, allAnimals) : null),
    [single, allAnimals],
  )

  const applicableTargets = useMemo(() => getApplicableTargets(animals), [animals])

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (!isOpen) return
    setTarget(null)
    setDate(new Date())
    setMaleId(null)
    setNotes('')
    setError(null)
    setApplying(false)
    setProgress(null)
    setMotherCriaTarget('engorda')
    // Default: si es madre lactante, preseleccionar todas sus crías
    if (single && single.computedStage === 'crias_lactantes') {
      const fam = getFamilyContext(single, allAnimals)
      setMotherCriaWeanIds(new Set(fam.crias.map((c) => c.id)))
    } else {
      setMotherCriaWeanIds(new Set())
    }
    setSiblingWeanIds(new Set())
  }, [isOpen, single, allAnimals])

  const requiresMaleParent = target === 'embarazada'
  const allowsNotes = target === 'descarte' || target === 'muerto' || target === 'perdido'

  const canApply =
    !!target && !applying && (target !== 'embarazada' || !!maleId) && animals.length > 0

  const handleApply = async () => {
    if (!target || !user?.id || !currentFarm?.id) {
      setError('Falta usuario o granja seleccionada.')
      return
    }
    setApplying(true)
    setError(null)
    setProgress({ current: 0, total: animals.length })

    // Recolectar crías a destetar simultáneamente
    const weanIds = new Set<string>()
    // Modo cría individual: hermanos seleccionados
    if (single && family?.isCria) {
      weanIds.add(single.id) // la cría misma se "desteta" cuando target la mueve
      for (const id of siblingWeanIds) weanIds.add(id)
    }
    // Modo madre individual: crías marcadas
    if (single && family?.isNursingMother) {
      for (const id of motherCriaWeanIds) weanIds.add(id)
    }
    // Modo bulk: las crías de las madres lactantes seleccionadas se incluyen automáticamente en applyChangeStage (computedStage === 'crias_lactantes')
    // Las crías individuales seleccionadas en bulk: si target ∈ {engorda, reproductor, juvenil}, no necesitan destete extra (el target ya las desteta vía rama 'engorda'/'reproductor'). Para target ∈ {descarte, perdido, muerto}, no se destetan separadamente — solo cambian status/stage.

    const payload: ChangeStagePayload = {
      target,
      date,
      maleId: target === 'embarazada' ? (maleId ?? undefined) : undefined,
      notes: allowsNotes && notes ? notes : undefined,
      weanCriaIds: weanIds.size > 0 ? weanIds : undefined,
      motherCriaWeanTarget: family?.isNursingMother ? motherCriaTarget : undefined,
    }

    // Modo cría individual: el animal mismo recibe el target (ya está en `animals`);
    // hermanos van por weanCriaIds. Modo madre individual: madre recibe target, crías solo
    // destetadas. Bulk: cada animal recibe el target; madres lactantes incluyen sus crías
    // automáticamente vía applyChangeStage.

    try {
      await applyChangeStage(
        animals,
        payload,
        { farmerId: user.id, farmId: currentFarm.id, allAnimals },
        { onProgress: (current, total) => setProgress({ current, total }) },
      )
      onApplied?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al aplicar cambio.')
    } finally {
      setApplying(false)
    }
  }

  const toggleSibling = (id: string) => {
    setSiblingWeanIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleMotherCria = (id: string) => {
    setMotherCriaWeanIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Etapa actual en modo individual
  const currentStageLabel = single
    ? animal_stage_config[single.computedStage ?? single.stage]?.label
    : null
  const currentStageIcon = single
    ? animal_stage_config[single.computedStage ?? single.stage]?.icon
    : null

  const isPregnantSingle = !!single && single.computedStage === 'embarazos'
  const isCriaSelection =
    !isPregnantSingle && animals.length > 0 && animals.every((a) => a.computedStage === 'cria')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover de etapa" size="md">
      <div className="space-y-4">
        {/* Header info */}
        {isIndividual ? (
          <div className="text-sm text-gray-700">
            <span className="text-gray-500">Etapa actual:</span>{' '}
            <span className="font-medium">
              {currentStageIcon} {currentStageLabel}
            </span>{' '}
            <span className="text-gray-500">— Animal:</span>{' '}
            <span className="font-mono">#{single?.animalNumber}</span>
          </div>
        ) : (
          <div className="text-sm text-gray-700">
            <span className="font-semibold">{animals.length}</span> animales seleccionados
          </div>
        )}

        {/* Hembra embarazada: solo desconfirmar embarazo o registrar parto */}
        {isPregnantSingle && single ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Esta hembra está embarazada. Las acciones disponibles son:
            </p>
            <div className="flex flex-col gap-2">
              {onRegisterBirth && (
                <Button
                  color="success"
                  icon="baby"
                  onClick={() => {
                    onRegisterBirth(single)
                    onClose()
                  }}
                >
                  Registrar parto
                </Button>
              )}
              {onUnconfirmPregnancy && (
                <Button
                  color="error"
                  variant="outline"
                  icon="close"
                  onClick={() => {
                    onUnconfirmPregnancy(single)
                    onClose()
                  }}
                >
                  Desconfirmar embarazo
                </Button>
              )}
              {!onRegisterBirth && !onUnconfirmPregnancy && (
                <p className="text-xs text-gray-500">
                  Acciones no disponibles desde esta vista.
                </p>
              )}
            </div>
          </div>
        ) : isCriaSelection ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Destetar a</p>
              <div className="flex flex-wrap gap-2">
                {(['engorda', 'reproductor'] as const).map((t) => {
                  const selected = target === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarget(t)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                        selected
                          ? 'bg-green-600 text-white border-green-700 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      disabled={applying}
                    >
                      <span>{TARGET_ICON[t]}</span>
                      <span>Destetar a {TARGET_LABEL[t]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Otros</p>
              <div className="flex flex-wrap gap-2">
                {(['perdido', 'muerto'] as const).map((t) => {
                  const selected = target === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarget(t)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                        selected
                          ? 'bg-green-600 text-white border-green-700 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      disabled={applying}
                    >
                      <span>{TARGET_ICON[t]}</span>
                      <span>{TARGET_LABEL[t]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-1">Mover a</p>
            <div className="flex flex-wrap gap-2">
              {applicableTargets.map((t) => {
                const selected = target === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTarget(t)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-all ${
                      selected
                        ? 'bg-green-600 text-white border-green-700 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={applying}
                  >
                    <span>{TARGET_ICON[t]}</span>
                    <span>{TARGET_LABEL[t]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Preview de etapa final (resuelve el computedStage tras aplicar) */}
        {!isPregnantSingle && target && animals.length > 0 && (
          <StagePreview animals={animals} target={target} />
        )}

        {/* Next step: campos contextuales */}
        {!isPregnantSingle && target && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase">Configuración</p>

            <DateTimeInput value={date} onChange={(d) => setDate(d ?? new Date())} label="Fecha" />

            {requiresMaleParent && (
              <div>
                <AnimalSelector
                  animals={allAnimals}
                  selectedIds={maleId ? [maleId] : []}
                  onAdd={(id) => setMaleId(id)}
                  onRemove={() => setMaleId(null)}
                  mode="single"
                  label="Macho padre"
                  filterFn={(a) => a.gender === 'macho' && (a.status ?? 'activo') === 'activo'}
                  placeholder="Buscar macho..."
                />
              </div>
            )}

            {allowsNotes && (
              <div>
                <label
                  htmlFor="change-stage-notes"
                  className="block text-xs font-medium text-gray-500 mb-1"
                >
                  {target === 'muerto'
                    ? 'Causa (opcional)'
                    : target === 'descarte'
                      ? 'Motivo (opcional)'
                      : 'Notas (opcional)'}
                </label>
                <input
                  id="change-stage-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  disabled={applying}
                />
              </div>
            )}
          </div>
        )}

        {/* Bloque cría individual: madre + hermanos */}
        {!isPregnantSingle && target && single && family?.isCria && family.mother && (
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Familia</p>
            <div className="text-sm">
              <span className="text-gray-500">Madre:</span>{' '}
              <AnimalTag animal={family.mother} showModalOnClick />
            </div>
            {family.siblings.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Hermanos sin destetar — marca para destetar también:
                </p>
                <div className="space-y-1">
                  {family.siblings.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siblingWeanIds.has(s.id)}
                        onChange={() => toggleSibling(s.id)}
                        disabled={applying}
                      />
                      <AnimalTag animal={s} showAge />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bloque madre lactante: crías a destetar */}
        {!isPregnantSingle && target && single && family?.isNursingMother && family.crias.length > 0 && (
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Crías lactando</p>
            <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
              Esta madre tiene {family.crias.length} cría
              {family.crias.length !== 1 ? 's' : ''} lactando. Para mover la madre, se destetarán
              primero.
            </p>
            <div className="space-y-1">
              {family.crias.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={motherCriaWeanIds.has(c.id)}
                    onChange={() => toggleMotherCria(c.id)}
                    disabled={applying}
                  />
                  <AnimalTag animal={c} showAge />
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Destetar crías a:</p>
              <div className="flex gap-2">
                {(['engorda', 'reproductor'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMotherCriaTarget(t)}
                    className={`px-3 py-1 rounded text-sm border ${
                      motherCriaTarget === t
                        ? 'bg-green-600 text-white border-green-700'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                    disabled={applying}
                  >
                    {animal_stage_config[t].icon} {animal_stage_config[t].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk warning si hay madres lactantes */}
        {!isIndividual && target && <BulkFamilyWarning animals={animals} allAnimals={allAnimals} />}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button variant="outline" color="neutral" onClick={onClose} disabled={applying}>
            Cancelar
          </Button>
          {!isPregnantSingle && (
            <Button color="primary" onClick={handleApply} disabled={!canApply}>
              {applying
                ? progress
                  ? `Aplicando ${progress.current}/${progress.total}...`
                  : 'Aplicando...'
                : 'Aplicar cambios'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

const StagePreview: React.FC<{ animals: Animal[]; target: TargetKey }> = ({ animals, target }) => {
  const preview = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const a of animals) {
      const key = predictFinalStage(a, target)
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
    return Array.from(buckets.entries())
  }, [animals, target])

  const labelFor = (key: string): { icon: string; label: string } => {
    if (key === 'perdido' || key === 'muerto') {
      return { icon: animal_status_icons[key], label: animal_status_labels[key] }
    }
    const cfg = animal_stage_config[key as keyof typeof animal_stage_config]
    return cfg ? { icon: cfg.icon, label: cfg.label } : { icon: '', label: key }
  }

  if (preview.length === 0) return null
  const single = animals.length === 1
  return (
    <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2">
      <span className="text-blue-700 font-medium">Resultado: </span>
      {preview.map(([key, count], i) => {
        const { icon, label } = labelFor(key)
        return (
          <span key={key}>
            {i > 0 && <span className="text-blue-700">, </span>}
            <span className="text-blue-900 font-medium">
              {icon} {label}
              {!single && ` (${count})`}
            </span>
          </span>
        )
      })}
      {!single && preview.length > 1 && (
        <p className="text-xs text-blue-700 mt-1">
          La etapa final depende de edad y especie de cada animal.
        </p>
      )}
      {single && preview.length === 1 && preview[0][0] !== target && target !== 'embarazada' && (
        <p className="text-xs text-blue-700 mt-1">
          {target === 'juvenil' || target === 'reproductor'
            ? 'La etapa final se ajusta automáticamente por edad.'
            : ''}
        </p>
      )}
    </div>
  )
}

const BulkFamilyWarning: React.FC<{ animals: Animal[]; allAnimals: Animal[] }> = ({
  animals,
  allAnimals,
}) => {
  const summary = useMemo(() => {
    let crias = 0
    let madres = 0
    let criasDeMadres = 0
    for (const a of animals) {
      if (a.computedStage === 'cria') crias++
      if (a.computedStage === 'crias_lactantes') {
        madres++
        const fam = getFamilyContext(a, allAnimals)
        criasDeMadres += fam.crias.length
      }
    }
    return { crias, madres, criasDeMadres }
  }, [animals, allAnimals])

  if (summary.crias === 0 && summary.madres === 0) return null
  return (
    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded space-y-1">
      {summary.madres > 0 && (
        <p>
          {summary.madres} madre{summary.madres !== 1 ? 's' : ''} lactando — sus{' '}
          {summary.criasDeMadres} cría{summary.criasDeMadres !== 1 ? 's' : ''} también serán
          destetadas.
        </p>
      )}
      {summary.crias > 0 && (
        <p>
          {summary.crias} cría{summary.crias !== 1 ? 's' : ''} en la selección recibirá el destino
          como destete.
        </p>
      )}
    </div>
  )
}

export default ModalChangeStage
