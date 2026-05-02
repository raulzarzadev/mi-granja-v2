import { doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { activeUnweanedOffspring, animalAge, computeAnimalStage } from '@/lib/animal-utils'
import { ANIMAL_BREEDING_CONFIGS, calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { batchUpdateAnimals } from '@/lib/batchUpdateAnimals'
import { db } from '@/lib/firebase'
import type { Animal } from '@/types/animals'

export type TargetKey =
  | 'reproductor'
  | 'embarazada'
  | 'engorda'
  | 'juvenil'
  | 'descarte'
  | 'perdido'
  | 'muerto'

export interface ChangeStagePayload {
  target: TargetKey
  date: Date
  /** Macho padre (target='embarazada') */
  maleId?: string
  /** Causa (target='muerto'); razón (target='descarte'); notas (target='perdido') */
  notes?: string
  /** IDs de crías a destetar simultáneamente (modo cría individual: hermanos; modo madre/bulk: crías de la madre seleccionadas) */
  weanCriaIds?: Set<string>
  /** Sub-destino para crías destetadas como parte de mover a la madre */
  motherCriaWeanTarget?: 'engorda' | 'reproductor'
}

export interface ChangeStageContext {
  farmerId: string
  farmId: string
  allAnimals: Animal[]
}

export const TARGET_LABEL: Record<TargetKey, string> = {
  reproductor: 'Reproducción',
  embarazada: 'Embarazada',
  engorda: 'Engorda',
  juvenil: 'Juvenil',
  descarte: 'Descarte',
  perdido: 'Perdido',
  muerto: 'Muerto',
}

export const TARGET_ICON: Record<TargetKey, string> = {
  reproductor: '❤️',
  embarazada: '🤰',
  engorda: '🍖',
  juvenil: '🌱',
  descarte: '🚫',
  perdido: '❓',
  muerto: '💀',
}

/**
 * Devuelve los destinos aplicables según la selección.
 * Reglas:
 * - Solo se consideran animales `status === 'activo'` (los demás se excluyen).
 * - Embarazada: requiere todas hembras (gender === 'hembra').
 * - Reproductor: requiere al menos uno con `ageMonths >= minBreedingAge` o sin birthDate (decisión usuario).
 * - Perdido/Muerto: visibles siempre (la operación los marca).
 */
export function getApplicableTargets(animals: Animal[]): TargetKey[] {
  if (animals.length === 0) return []
  const active = animals.filter((a) => (a.status ?? 'activo') === 'activo')
  if (active.length === 0) return []

  const out: TargetKey[] = []

  out.push('engorda')
  out.push('descarte')
  out.push('juvenil')

  // Reproductor: aceptar siempre (UI permite, la regla de edad luego determina computedStage juvenil vs reproductor)
  out.push('reproductor')

  // Embarazada: solo hembras
  const allFemale = active.every((a) => a.gender === 'hembra')
  if (allFemale) out.push('embarazada')

  out.push('perdido')
  out.push('muerto')

  return out
}

/** Calcula crías activas no destetadas de una madre. */
export function getUnweanedCriasOf(mother: Animal, allAnimals: Animal[]): Animal[] {
  return activeUnweanedOffspring({ farmAnimals: allAnimals, motherId: mother.id })
}

/** Mapea target a `weaningDestination` para crías destetadas en operaciones secundarias. */
function targetToWeaningDestination(target: TargetKey): 'engorda' | 'reproductor' {
  if (target === 'reproductor' || target === 'engorda') return target
  return 'engorda'
}

interface ApplyOptions {
  onProgress?: (current: number, total: number) => void
}

/**
 * Aplica el cambio de etapa a todos los animales seleccionados.
 *
 * Lógica:
 * 1. Si hay `weanCriaIds` → destetar primero esas crías (con `weaningDestination`).
 * 2. Si la selección incluye madres lactantes → destetar TODAS sus crías activas (mismo paso 1 fusionado).
 * 3. Para cada madre cuyas últimas crías quedaron destetadas → cerrar lactancia (`weanedMotherAt`, `birthedAt: null`).
 * 4. Aplicar el target al conjunto principal de animales:
 *    - Stages manuales (engorda, descarte): `stage = target`.
 *    - Reproductor: `stage='reproductor'`, `weaningDestination='reproductor'`, `isWeaned=true`, `weanedAt`.
 *    - Juvenil: `stage='juvenil'`, `weaningDestination=null`.
 *    - Perdido: `status='perdido'`, `statusAt`, `lostInfo.lostAt`.
 *    - Muerto: `status='muerto'`, `statusAt`, `statusNotes`.
 *    - Embarazada: crear breeding record + actualizar `pregnantAt`/`pregnantBy`.
 */
export async function applyChangeStage(
  primaryAnimals: Animal[],
  payload: ChangeStagePayload,
  ctx: ChangeStageContext,
  opts: ApplyOptions = {},
): Promise<void> {
  const { target, date, maleId, notes, weanCriaIds, motherCriaWeanTarget } = payload
  const { allAnimals, farmerId, farmId } = ctx
  const dateTs = Timestamp.fromDate(date)

  // ─── 1. Recolectar crías a destetar como parte de la operación ───
  const criasToWean = new Set<string>(weanCriaIds ?? [])
  // Si selección incluye madres lactantes (computedStage), agregar todas sus crías activas.
  for (const animal of primaryAnimals) {
    if (animal.computedStage === 'crias_lactantes') {
      const crias = getUnweanedCriasOf(animal, allAnimals)
      for (const c of crias) criasToWean.add(c.id)
    }
  }

  const criaWeanDestination = motherCriaWeanTarget ?? targetToWeaningDestination(target)
  const criaNextStage: 'engorda' | 'juvenil' =
    criaWeanDestination === 'engorda' ? 'engorda' : 'juvenil'

  // ─── 2. Destetar crías ───
  if (criasToWean.size > 0) {
    await batchUpdateAnimals(
      Array.from(criasToWean),
      {
        isWeaned: true,
        weanedAt: dateTs,
        stage: criaNextStage,
        weaningDestination: criaWeanDestination,
      } as unknown as Partial<Animal>,
      { onProgress: opts.onProgress },
    )

    // Cerrar madres cuyas últimas crías fueron destetadas en esta tanda
    const mothersToClose = new Set<string>()
    const byMother = new Map<string, Set<string>>()
    for (const a of allAnimals) {
      if (
        a.stage !== 'cria' ||
        a.status === 'muerto' ||
        a.status === 'vendido' ||
        a.status === 'perdido'
      )
        continue
      if (!a.motherId) continue
      if (!byMother.has(a.motherId)) byMother.set(a.motherId, new Set())
      byMother.get(a.motherId)!.add(a.id)
    }
    for (const [motherId, criaIds] of byMother) {
      const remaining = [...criaIds].filter((id) => !criasToWean.has(id))
      if (remaining.length === 0) mothersToClose.add(motherId)
    }
    if (mothersToClose.size > 0) {
      const batch = writeBatch(db)
      for (const motherId of mothersToClose) {
        batch.update(doc(db, 'animals', motherId), {
          weanedMotherAt: dateTs,
          birthedAt: null,
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
    }
  }

  // ─── 3. Aplicar target al conjunto principal ───
  // Filtrar primaryAnimals: excluir los que están solo presentes para destetar crías (madres a las que se aplica target sí; crías individuales en weanCriaIds que también están en primaryAnimals sí, pero ya fueron destetadas arriba).
  const primaryIds = primaryAnimals
    .filter((a) => (a.status ?? 'activo') === 'activo')
    .map((a) => a.id)

  if (primaryIds.length === 0) return

  switch (target) {
    case 'engorda':
      await batchUpdateAnimals(
        primaryIds,
        {
          stage: 'engorda',
          weaningDestination: 'engorda',
          isWeaned: true,
          weanedAt: dateTs,
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'reproductor':
      await batchUpdateAnimals(
        primaryIds,
        {
          stage: 'reproductor',
          weaningDestination: 'reproductor',
          isWeaned: true,
          weanedAt: dateTs,
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'juvenil':
      await batchUpdateAnimals(
        primaryIds,
        {
          stage: 'juvenil',
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'descarte':
      await batchUpdateAnimals(
        primaryIds,
        {
          stage: 'descarte',
          ...(notes ? { statusNotes: notes } : {}),
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'perdido':
      await batchUpdateAnimals(
        primaryIds,
        {
          status: 'perdido',
          statusAt: dateTs,
          lostInfo: { lostAt: dateTs },
          ...(notes ? { statusNotes: notes } : {}),
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'muerto':
      await batchUpdateAnimals(
        primaryIds,
        {
          status: 'muerto',
          statusAt: dateTs,
          ...(notes ? { statusNotes: notes } : {}),
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break

    case 'embarazada': {
      if (!maleId) throw new Error('Falta macho padre para target embarazada')
      // Crear breeding record con todas las hembras
      const dateTsStart = Timestamp.fromDate(date)
      const breedingId = `BR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

      const femaleBreedingInfo = primaryAnimals.map((a) => {
        const expected = calculateExpectedBirthDate(date, a.type)
        return {
          femaleId: a.id,
          pregnancyConfirmedDate: dateTsStart,
          expectedBirthDate: expected ? Timestamp.fromDate(expected) : null,
          actualBirthDate: null,
          offspring: [],
        }
      })

      const now = Timestamp.now()
      const docData = {
        breedingId,
        farmerId,
        farmId,
        maleId,
        breedingDate: dateTsStart,
        femaleBreedingInfo,
        notes: notes || '',
        status: 'finished', // todas las hembras ya tienen pregnancyConfirmedDate
        createdAt: now,
        updatedAt: now,
      }

      const { addDoc, collection } = await import('firebase/firestore')
      await addDoc(collection(db, 'breedingRecords'), docData)

      // Actualizar animales
      await batchUpdateAnimals(
        primaryIds,
        {
          pregnantAt: dateTs,
          pregnantBy: maleId,
          birthedAt: null,
          weanedMotherAt: null,
        } as unknown as Partial<Animal>,
        { onProgress: opts.onProgress },
      )
      break
    }
  }
}

/**
 * Helpers para UI: detecta si un animal es cría o madre lactante (para mostrar bloque familiar).
 */
export function getFamilyContext(
  animal: Animal,
  allAnimals: Animal[],
): {
  isCria: boolean
  isNursingMother: boolean
  mother?: Animal
  siblings: Animal[]
  crias: Animal[]
} {
  const isCria = animal.computedStage === 'cria'
  const isNursingMother = animal.computedStage === 'crias_lactantes'
  let mother: Animal | undefined
  let siblings: Animal[] = []
  let crias: Animal[] = []

  if (isCria && animal.motherId) {
    mother = allAnimals.find((a) => a.id === animal.motherId || a.animalNumber === animal.motherId)
    if (mother) {
      siblings = activeUnweanedOffspring({
        farmAnimals: allAnimals,
        motherId: mother.id,
      }).filter((s) => s.id !== animal.id)
    }
  }

  if (isNursingMother) {
    crias = activeUnweanedOffspring({ farmAnimals: allAnimals, motherId: animal.id })
  }

  return { isCria, isNursingMother, mother, siblings, crias }
}

/** Helpers expuestos para UI (no usados internamente) */
export { ANIMAL_BREEDING_CONFIGS, animalAge }

/**
 * Predice el `computedStage` final que tendrá el animal después de aplicar el target.
 * Útil para mostrar al usuario el resultado real (ej. juvenil → reproductor por edad).
 *
 * Reglas (deben mantenerse alineadas con `computeAnimalStage` y `computeAnimalEffectiveStage`):
 * - target='engorda' → 'engorda' (manual)
 * - target='descarte' → 'descarte' (manual)
 * - target='reproductor' → 'juvenil' o 'reproductor' según `minBreedingAge` (weaningDestination override)
 * - target='juvenil' → recompute: si edad < weaningDays → 'cria'; si edad < minBreedingAge → 'juvenil'; sino → 'reproductor'
 * - target='embarazada' → 'embarazos' (breeding-derived)
 * - target='perdido' → 'perdido' (status, no es stage; se muestra como key especial)
 * - target='muerto' → 'muerto' (status)
 */
export type PredictedKey =
  | 'cria'
  | 'juvenil'
  | 'engorda'
  | 'reproductor'
  | 'descarte'
  | 'embarazos'
  | 'perdido'
  | 'muerto'

export function predictFinalStage(animal: Animal, target: TargetKey): PredictedKey {
  if (target === 'perdido') return 'perdido'
  if (target === 'muerto') return 'muerto'
  if (target === 'embarazada') return 'embarazos'

  // Simular animal con fields del target aplicados
  const sim: Animal = { ...animal }
  switch (target) {
    case 'engorda':
      sim.stage = 'engorda'
      sim.weaningDestination = 'engorda'
      sim.isWeaned = true
      break
    case 'descarte':
      sim.stage = 'descarte'
      break
    case 'reproductor':
      sim.stage = 'reproductor'
      sim.weaningDestination = 'reproductor'
      sim.isWeaned = true
      break
    case 'juvenil':
      sim.stage = 'juvenil'
      sim.weaningDestination = undefined
      break
  }
  return computeAnimalStage(sim) as PredictedKey
}
