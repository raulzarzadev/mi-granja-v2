import { Timestamp } from 'firebase-admin/firestore'
import { animalIdentityMatchesSearch } from '@/lib/animal-search'
import {
  activeUnweanedOffspring,
  computeAnimalEffectiveStage,
  getWeaningDueDate,
  getWeaningStatus,
  isActiveCalf,
} from '@/lib/animal-utils'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { Reminder } from '@/types'
import { Animal, type AnimalStageKey, isActivePregnancy, isMilkRecord } from '@/types/animals'
import {
  BreedingRecord,
  generateBreedingId as buildBreedingId,
  type FemaleBreedingInfo,
  finalizeFemaleBreedingOutcomes,
} from '@/types/breedings'
import type { FarmPermission } from '@/types/farm'
import { selectRelevance } from './context-relevance'
import {
  asAiDate as asDate,
  aiDateKey as dateKey,
  normalizeAiReminder,
} from './context-serialization'
import { hasPermission } from './server'
import { AiAction } from './types'

interface ExecuteParams {
  action: AiAction
  userId: string
  farmId: string
  permissions: FarmPermission[]
}

function parseLocalDate(value: string, time = '00:00'): Date {
  if (value.trim().toLowerCase() === 'hoy') {
    const now = new Date()
    const [hh, mm] = time.split(':').map(Number)
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 0, mm || 0)
  }
  const [y, m, d] = value.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)
}

function toTimestamp(value: string, time?: string): Timestamp {
  return Timestamp.fromDate(parseLocalDate(value, time))
}

async function getFarmAnimals(farmId: string): Promise<Animal[]> {
  const firestore = getAdminFirestore()
  const snap = await firestore.collection('animals').where('farmId', '==', farmId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Animal)
}

function resolveAnimal(animals: Animal[], ref: string): Animal {
  const matches = animals.filter((animal) => animalIdentityMatchesSearch(animal, ref))
  if (matches.length === 0) throw new Error(`No encontré el animal "${ref}" en esta granja`)
  if (matches.length > 1)
    throw new Error(`"${ref}" coincide con más de un animal. Usa el número exacto`)
  return matches[0]
}

function generateBreedingId(breedingDate: Date, records: BreedingRecord[]): string {
  return buildBreedingId(breedingDate, records)
}

async function getFarmBreedingRecords(farmId: string): Promise<BreedingRecord[]> {
  const firestore = getAdminFirestore()
  const snap = await firestore.collection('breedingRecords').where('farmId', '==', farmId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BreedingRecord)
}

function normalizeAnimal(doc: FirebaseFirestore.QueryDocumentSnapshot): Animal {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
    birthDate: asDate(data.birthDate) ?? undefined,
    createdAt: asDate(data.createdAt) ?? new Date(0),
    updatedAt: asDate(data.updatedAt) ?? new Date(0),
    statusAt: asDate(data.statusAt) ?? undefined,
    availableToSaleAt: asDate(data.availableToSaleAt),
    pregnantAt: asDate(data.pregnantAt),
    birthedAt: asDate(data.birthedAt),
    weanedAt: asDate(data.weanedAt) ?? undefined,
    weanedMotherAt: asDate(data.weanedMotherAt),
    driedAt: asDate(data.driedAt),
    currentAreaAssignedAt: asDate(data.currentAreaAssignedAt),
    records: Array.isArray(data.records)
      ? data.records.map((entry: Record<string, unknown>) => ({
          ...entry,
          date: asDate(entry.date) ?? new Date(0),
          createdAt: asDate(entry.createdAt) ?? asDate(entry.date) ?? new Date(0),
          nextDueDate: asDate(entry.nextDueDate) ?? undefined,
        }))
      : [],
  } as Animal
}

function normalizeBreedingRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): BreedingRecord {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
    breedingDate: asDate(data.breedingDate),
    femaleBreedingInfo: ((data.femaleBreedingInfo || []) as Record<string, unknown>[]).map(
      (info) =>
        ({
          ...info,
          pregnancyConfirmedDate: asDate(info.pregnancyConfirmedDate),
          expectedBirthDate: asDate(info.expectedBirthDate),
          actualBirthDate: asDate(info.actualBirthDate),
        }) as FemaleBreedingInfo,
    ),
    createdAt: asDate(data.createdAt) ?? undefined,
    updatedAt: asDate(data.updatedAt) ?? undefined,
  } as BreedingRecord
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<T, number>,
  )
}

function daysUntil(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function startOfDay(value: Date): Date {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

function litersFromMl(amountMl: number): number {
  return Math.round((amountMl / 1000) * 1000) / 1000
}

function weightInKg(value: Animal['weight']): number | null {
  const grams = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(grams) || grams === null || grams === undefined) return null
  return Math.round((Number(grams) / 1000) * 100) / 100
}

export interface AiContextAccess {
  animals: boolean
  reminders: boolean
  breeding: boolean
}

async function createAnimal(
  action: Extract<AiAction, { type: 'create_animal' }>,
  params: ExecuteParams,
) {
  if (!hasPermission(params.permissions, 'animals', 'create')) {
    throw new Error('No tienes permiso para crear animales')
  }
  const firestore = getAdminFirestore()
  const animals = await getFarmAnimals(params.farmId)
  const payload = action.payload

  if (animals.some((animal) => animal.animalNumber === payload.animalNumber)) {
    throw new Error(`Ya existe un animal con número ${payload.animalNumber}`)
  }

  const mother = payload.motherRef ? resolveAnimal(animals, payload.motherRef) : null
  const father = payload.fatherRef ? resolveAnimal(animals, payload.fatherRef) : null
  const now = Timestamp.now()

  const docData = {
    animalNumber: payload.animalNumber,
    name: payload.name || '',
    type: payload.type,
    gender: payload.gender,
    stage: payload.stage,
    breed: payload.breed || '',
    farmerId: params.userId,
    farmId: params.farmId,
    ...(payload.birthDate ? { birthDate: toTimestamp(payload.birthDate) } : {}),
    ...(typeof payload.weightKg === 'number'
      ? { weight: Math.round(payload.weightKg * 1000) }
      : {}),
    ...(mother ? { motherId: mother.id } : {}),
    ...(father ? { fatherId: father.id } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    createdAt: now,
    updatedAt: now,
  }

  const ref = await firestore.collection('animals').add(docData)
  return { id: ref.id, message: `Animal ${payload.animalNumber} creado` }
}

async function createBreeding(
  action: Extract<AiAction, { type: 'create_breeding' }>,
  params: ExecuteParams,
) {
  if (!hasPermission(params.permissions, 'breeding', 'create')) {
    throw new Error('No tienes permiso para registrar empadres')
  }

  const firestore = getAdminFirestore()
  const animals = await getFarmAnimals(params.farmId)
  const records = await getFarmBreedingRecords(params.farmId)
  const payload = action.payload
  const male = resolveAnimal(animals, payload.maleRef)
  const females = payload.femaleRefs.map((ref) => resolveAnimal(animals, ref))

  if (male.gender !== 'macho') throw new Error(`${male.animalNumber} no es macho`)
  for (const female of females) {
    if (female.gender !== 'hembra') throw new Error(`${female.animalNumber} no es hembra`)
    if (female.type !== male.type)
      throw new Error(`${female.animalNumber} no es de la misma especie`)
  }

  const breedingDate = parseLocalDate(payload.breedingDate)
  const now = Timestamp.now()
  await firestore.collection('breedingRecords').add({
    breedingId: generateBreedingId(breedingDate, records),
    farmerId: params.userId,
    farmId: params.farmId,
    maleId: male.id,
    breedingDate: Timestamp.fromDate(breedingDate),
    femaleBreedingInfo: females.map((female) => ({
      femaleId: female.id,
      pregnancyConfirmedDate: null,
      expectedBirthDate: null,
      actualBirthDate: null,
      offspring: [],
    })),
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  })

  return { message: `Empadre registrado con ${females.length} hembra(s)` }
}

async function registerBirth(
  action: Extract<AiAction, { type: 'register_birth' }>,
  params: ExecuteParams,
) {
  if (!hasPermission(params.permissions, 'breeding', 'update')) {
    throw new Error('No tienes permiso para registrar partos')
  }
  if (!hasPermission(params.permissions, 'animals', 'create')) {
    throw new Error('No tienes permiso para crear las crías del parto')
  }

  const firestore = getAdminFirestore()
  const animals = await getFarmAnimals(params.farmId)
  const records = await getFarmBreedingRecords(params.farmId)
  const payload = action.payload
  const mother = resolveAnimal(animals, payload.motherRef)
  if (mother.gender !== 'hembra') throw new Error(`${mother.animalNumber} no es hembra`)

  if (!isActivePregnancy(mother)) {
    throw new Error(`No hay una gestación activa para ${mother.animalNumber}`)
  }

  const activeRecords = records.filter((record) =>
    record.femaleBreedingInfo?.some((info) => info.femaleId === mother.id && !info.actualBirthDate),
  )
  const linkedRecord = mother.pregnantBreedingRecordId
    ? records.find((record) => record.id === mother.pregnantBreedingRecordId)
    : undefined
  if (activeRecords.length > 1 && !linkedRecord) {
    throw new Error(`${mother.animalNumber} tiene más de un empadre activo. Revísalo manualmente`)
  }

  for (const offspring of payload.offspring) {
    if (animals.some((animal) => animal.animalNumber === offspring.animalNumber)) {
      throw new Error(`Ya existe un animal con número ${offspring.animalNumber}`)
    }
  }

  const record = linkedRecord ?? activeRecords[0] ?? null
  const birthDate = parseLocalDate(payload.birthDate, payload.birthTime)
  const now = Timestamp.now()
  const batch = firestore.batch()
  const offspringIds: string[] = []

  for (const offspring of payload.offspring) {
    const ref = firestore.collection('animals').doc()
    offspringIds.push(ref.id)
    batch.set(ref, {
      animalNumber: offspring.animalNumber,
      type: mother.type,
      stage: 'cria',
      gender: offspring.gender,
      farmerId: params.userId,
      farmId: params.farmId,
      birthDate: Timestamp.fromDate(birthDate),
      motherId: mother.id,
      ...(record?.maleId || mother.pregnantBy
        ? { fatherId: record?.maleId ?? mother.pregnantBy }
        : {}),
      ...(typeof offspring.weightKg === 'number'
        ? { weight: Math.round(offspring.weightKg * 1000) }
        : {}),
      ...(offspring.status !== 'activo'
        ? { status: offspring.status, statusAt: Timestamp.fromDate(birthDate) }
        : {}),
      ...(offspring.notes ? { notes: offspring.notes } : {}),
      createdAt: now,
      updatedAt: now,
    })
  }

  if (record) {
    const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
      info.femaleId === mother.id
        ? {
            ...info,
            actualBirthDate: Timestamp.fromDate(birthDate),
            offspring: [...(info.offspring || []), ...offspringIds],
          }
        : info,
    )

    batch.update(firestore.collection('breedingRecords').doc(record.id), {
      femaleBreedingInfo: updatedFemaleInfo,
      updatedAt: now,
    })
  }
  batch.update(firestore.collection('animals').doc(mother.id), {
    birthedAt: Timestamp.fromDate(birthDate),
    pregnantAt: null,
    pregnantBy: null,
    pregnantBreedingRecordId: null,
    pregnantBreedingId: null,
    records: [
      ...(mother.records || []),
      {
        id: crypto.randomUUID(),
        type: 'birth',
        category: 'general',
        title: `Parto: ${payload.offspring.length} cría${payload.offspring.length > 1 ? 's' : ''}`,
        description: payload.offspring.map((offspring) => `#${offspring.animalNumber}`).join(', '),
        date: Timestamp.fromDate(birthDate),
        notes: payload.notes || '',
        createdAt: now,
        createdBy: params.userId,
      },
    ],
    updatedAt: now,
  })

  await batch.commit()
  return { message: `Parto registrado con ${payload.offspring.length} cría(s)` }
}

async function registerBirths(
  action: Extract<AiAction, { type: 'register_births' }>,
  params: ExecuteParams,
) {
  const results = []
  for (const birth of action.payload.births) {
    results.push(
      await registerBirth(
        {
          type: 'register_birth',
          payload: birth,
          summary: `Registrar parto de ${birth.motherRef}`,
        },
        params,
      ),
    )
  }
  return { message: results.map((result) => result.message).join('. ') }
}

async function createReminder(
  action: Extract<AiAction, { type: 'create_reminder' }>,
  params: ExecuteParams,
) {
  if (!hasPermission(params.permissions, 'reminders', 'create')) {
    throw new Error('No tienes permiso para crear recordatorios')
  }

  const firestore = getAdminFirestore()
  const animals = await getFarmAnimals(params.farmId)
  const payload = action.payload
  const animalNumbers = payload.animalRefs.map((ref) => resolveAnimal(animals, ref).animalNumber)
  const completionByAnimal = Object.fromEntries(animalNumbers.map((number) => [number, false]))
  const now = Timestamp.now()

  const docData: Omit<Reminder, 'id' | 'dueDate' | 'createdAt' | 'updatedAt'> & {
    dueDate: Timestamp
    createdAt: Timestamp
    updatedAt: Timestamp
  } = {
    farmerId: params.userId,
    farmId: params.farmId,
    animalNumber: animalNumbers[0] || undefined,
    animalNumbers,
    title: payload.title,
    description: payload.description || '',
    dueDate: toTimestamp(payload.dueDate),
    completed: false,
    completionByAnimal,
    priority: payload.priority,
    type: payload.type,
    createdAt: now,
    updatedAt: now,
  }

  await firestore.collection('reminders').add(docData)
  return { message: `Recordatorio creado: ${payload.title}` }
}

async function finishBreeding(
  action: Extract<AiAction, { type: 'finish_breeding' }>,
  params: ExecuteParams,
) {
  if (!hasPermission(params.permissions, 'breeding', 'update')) {
    throw new Error('No tienes permiso para terminar empadres')
  }

  const firestore = getAdminFirestore()
  const records = await getFarmBreedingRecords(params.farmId)
  const ref = action.payload.breedingRef.trim().toLowerCase()
  const matches = records.filter(
    (record) => record.id.toLowerCase() === ref || record.breedingId?.toLowerCase() === ref,
  )
  if (matches.length === 0) throw new Error(`No encontré el empadre ${action.payload.breedingRef}`)
  if (matches.length > 1)
    throw new Error(`Hay más de un empadre que coincide con ${action.payload.breedingRef}`)

  await firestore
    .collection('breedingRecords')
    .doc(matches[0].id)
    .update({
      status: 'finished',
      femaleBreedingInfo: finalizeFemaleBreedingOutcomes(matches[0].femaleBreedingInfo),
      updatedAt: Timestamp.now(),
    })

  return { message: `Empadre ${matches[0].breedingId || matches[0].id} terminado` }
}

export async function executeAiAction(params: ExecuteParams) {
  switch (params.action.type) {
    case 'create_animal':
      return createAnimal(params.action, params)
    case 'create_breeding':
      return createBreeding(params.action, params)
    case 'register_birth':
      return registerBirth(params.action, params)
    case 'register_births':
      return registerBirths(params.action, params)
    case 'create_reminder':
      return createReminder(params.action, params)
    case 'finish_breeding':
      return finishBreeding(params.action, params)
  }
}

// Decide qué detalle crudo incluir según la pregunta, para no volcar
// cientos de registros en cada llamada (degrada la precisión del modelo).
export async function buildAiContext(
  farmId: string,
  message = '',
  access: AiContextAccess = { animals: true, reminders: true, breeding: true },
) {
  const firestore = getAdminFirestore()
  const [animalsSnap, remindersSnap, breedingSnap] = await Promise.all([
    access.animals
      ? firestore.collection('animals').where('farmId', '==', farmId).get()
      : Promise.resolve(null),
    access.reminders
      ? firestore
          .collection('reminders')
          .where('farmId', '==', farmId)
          .where('completed', '==', false)
          .get()
      : Promise.resolve(null),
    access.breeding
      ? firestore.collection('breedingRecords').where('farmId', '==', farmId).get()
      : Promise.resolve(null),
  ])

  const today = new Date()
  const farmAnimals = animalsSnap?.docs.map(normalizeAnimal) ?? []
  const farmBreedingRecords = breedingSnap?.docs.map(normalizeBreedingRecord) ?? []
  const animalsWithComputedStage = farmAnimals.map((animal) => ({
    ...animal,
    computedStage: computeAnimalEffectiveStage(animal, farmBreedingRecords, today, farmAnimals),
  }))
  const activeAnimals = animalsWithComputedStage.filter(
    (animal) => animal.status === 'activo' || animal.status === undefined || animal.status === null,
  )
  const visibleAnimalNumber = (reference?: string | null) => {
    if (!reference) return null
    return (
      farmAnimals.find(
        (candidate) => candidate.id === reference || candidate.animalNumber === reference,
      )?.animalNumber ?? null
    )
  }
  const animals = animalsWithComputedStage.map((animal) => {
    const animalMilkEntries = (animal.records || []).filter(isMilkRecord)
    const lastMilkRecord = [...animalMilkEntries].sort(
      (a, b) => (asDate(b.date)?.getTime() ?? 0) - (asDate(a.date)?.getTime() ?? 0),
    )[0]
    const lastRecord = [...(animal.records || [])].sort(
      (a, b) => (asDate(b.date)?.getTime() ?? 0) - (asDate(a.date)?.getTime() ?? 0),
    )[0]
    return {
      id: animal.id,
      numero: animal.animalNumber,
      nombre: animal.name || '',
      especie: animal.type,
      raza: animal.breed || null,
      genero: animal.gender,
      etapa: animal.stage,
      etapaCalculada: animal.computedStage,
      estado: animal.status || 'activo',
      pesoActualKg: weightInKg(animal.weight),
      lote: animal.batch || null,
      tieneAreaAsignada: Boolean(animal.currentAreaId),
      madre: visibleAnimalNumber(animal.motherId),
      padre: visibleAnimalNumber(animal.fatherId),
      fechaNacimiento: dateKey(animal.birthDate),
      destetado: Boolean(animal.isWeaned || animal.weanedAt),
      fechaDestete: dateKey(animal.weanedAt),
      destinoDestete: animal.weaningDestination || null,
      fechaEmbarazo: dateKey(animal.pregnantAt),
      fechaParto: dateKey(animal.birthedAt),
      lactancia: {
        estado: animal.lactationStatus || null,
        proposito: animal.lactationPurpose || null,
        fechaSecado: dateKey(animal.driedAt),
        totalOrdeños: animalMilkEntries.length,
        ultimoOrdeño: lastMilkRecord
          ? {
              fecha: dateKey(lastMilkRecord.date),
              litros: litersFromMl(lastMilkRecord.amountMl),
              turno: lastMilkRecord.session,
            }
          : null,
      },
      registros: {
        total: animal.records?.length || 0,
        ultimo: lastRecord
          ? {
              fecha: dateKey(lastRecord.date),
              tipo: lastRecord.type,
              titulo: lastRecord.title,
            }
          : null,
      },
    }
  })

  const reminders = (remindersSnap?.docs ?? []).map((doc) =>
    normalizeAiReminder(doc.id, doc.data()),
  )

  const pregnancyCandidates: {
    empadre: string
    macho: string
    hembrasPendientes: string[]
  }[] = []
  const expectedBirths: {
    hembra: string
    macho: string
    empadre: string
    fechaEsperada: string | null
    diasRestantes: number | null
  }[] = []

  const breedingRecords = farmBreedingRecords.map((record) => {
    const male = animals.find((animal) => animal.id === record.maleId)
    const breedingLabel = record.breedingId || 'sin código visible'
    const femaleInfos = record.femaleBreedingInfo || []
    const pendingFemales = femaleInfos
      .filter((info: FemaleBreedingInfo) => !info.pregnancyConfirmedDate && !info.actualBirthDate)
      .map(
        (info: FemaleBreedingInfo) =>
          animals.find((animal) => animal.id === info.femaleId)?.numero || 'sin numero visible',
      )
    if ((record.status || 'active') !== 'finished' && pendingFemales.length > 0) {
      pregnancyCandidates.push({
        empadre: breedingLabel,
        macho: male?.numero || 'sin macho visible',
        hembrasPendientes: pendingFemales,
      })
    }

    for (const info of femaleInfos) {
      if (!info.pregnancyConfirmedDate || info.actualBirthDate) continue
      const expectedDate = asDate(info.expectedBirthDate ?? info.pregnancyConfirmedDate)
      expectedBirths.push({
        hembra:
          animals.find((animal) => animal.id === info.femaleId)?.numero || 'sin numero visible',
        macho: male?.numero || 'sin macho visible',
        empadre: breedingLabel,
        fechaEsperada: dateKey(expectedDate),
        diasRestantes: expectedDate
          ? Math.round((expectedDate.getTime() - today.getTime()) / 86400000)
          : null,
      })
    }

    return {
      id: breedingLabel,
      estado: record.status || 'active',
      macho: male?.numero || 'sin macho visible',
      fecha: dateKey(record.breedingDate),
      hembras: femaleInfos.map((info: FemaleBreedingInfo) => ({
        hembra:
          animals.find((animal) => animal.id === info.femaleId)?.numero || 'sin numero visible',
        embarazoConfirmado: Boolean(info.pregnancyConfirmedDate),
        fechaEsperada: dateKey(info.expectedBirthDate),
        parto: Boolean(info.actualBirthDate),
        fechaParto: dateKey(info.actualBirthDate),
      })),
    }
  })

  const pendingWeaningRows = activeAnimals
    .filter(isActiveCalf)
    .map((animal) => {
      const weanDate = getWeaningDueDate(animal)
      const weaningStatus = getWeaningStatus(animal, today)
      const mother = farmAnimals.find(
        (candidate) =>
          candidate.id === animal.motherId || candidate.animalNumber === animal.motherId,
      )
      return {
        numero: animal.animalNumber,
        madre: mother?.animalNumber || null,
        especie: animal.type,
        fechaNacimiento: dateKey(animal.birthDate),
        fechaDesteteEstimada: dateKey(weanDate),
        diasRestantes: weaningStatus.daysUntilDue,
        estadoDestete: weaningStatus.description,
      }
    })
    .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999))

  const nursingMothers = activeAnimals
    .filter((animal) => animal.computedStage === 'crias_lactantes')
    .map((mother) => {
      const offspring = activeUnweanedOffspring({ farmAnimals, motherId: mother.id })
      return {
        numero: mother.animalNumber,
        criasPendientes: offspring.length,
        crias: offspring.map((animal) => animal.animalNumber),
      }
    })

  const todayStart = startOfDay(today)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const milkEntries = activeAnimals.flatMap((animal) =>
    (animal.records || [])
      .filter(isMilkRecord)
      .map((entry) => ({ animal, entry, date: asDate(entry.date) })),
  )
  const milkToday = milkEntries.filter(
    ({ date }) => date && startOfDay(date).getTime() === todayStart.getTime(),
  )
  const milkLast7Days = milkEntries.filter(({ date }) => {
    if (!date) return false
    const entryDay = startOfDay(date)
    return (
      entryDay.getTime() >= sevenDaysAgo.getTime() && entryDay.getTime() <= todayStart.getTime()
    )
  })
  const lactatingFemales = activeAnimals.filter(
    (animal) =>
      animal.gender === 'hembra' &&
      (animal.lactationStatus === 'active' || animal.computedStage === 'crias_lactantes'),
  )
  const dairyFemalesWithoutMilkToday = lactatingFemales.filter((animal) => {
    if (animal.lactationPurpose !== 'dairy' && animal.lactationPurpose !== 'dual') return false
    return !milkToday.some(({ animal: milkAnimal }) => milkAnimal.id === animal.id)
  })

  const recentMovements: {
    fecha: string
    momento: string
    animal: string
    tipo: string
    detalle: string
  }[] = []
  const addMovement = (date: unknown, animal: Animal, type: string, detail: string) => {
    const movementDate = asDate(date)
    if (!movementDate) return
    recentMovements.push({
      fecha: dateKey(movementDate) || '',
      momento: movementDate.toISOString(),
      animal: animal.animalNumber,
      tipo: type,
      detalle: detail.slice(0, 240),
    })
  }
  for (const animal of farmAnimals) {
    for (const record of animal.records || []) {
      const detail = isMilkRecord(record)
        ? `${litersFromMl(record.amountMl)} L · ${record.session}${record.notes ? ` · ${record.notes}` : ''}`
        : `${record.title}${record.notes ? ` · ${record.notes}` : ''}`
      addMovement(
        record.date,
        animal,
        record.type === 'milk' ? 'ordeño' : `registro_${record.type}`,
        detail,
      )
    }
    if (animal.statusAt) {
      addMovement(animal.statusAt, animal, 'estado', animal.status || 'activo')
    }
    if (animal.weanedAt) {
      addMovement(
        animal.weanedAt,
        animal,
        'destete',
        animal.weaningDestination ? `Destino: ${animal.weaningDestination}` : 'Destetado',
      )
    }
    if (animal.pregnantAt) {
      addMovement(animal.pregnantAt, animal, 'embarazo', 'Gestación confirmada')
    }
    const hasBirthRecord = (animal.records || []).some(
      (record) => record.type === 'birth' && dateKey(record.date) === dateKey(animal.birthedAt),
    )
    if (animal.birthedAt && !hasBirthRecord) {
      addMovement(animal.birthedAt, animal, 'parto', 'Parto registrado')
    }
    if (animal.currentAreaAssignedAt) {
      addMovement(
        animal.currentAreaAssignedAt,
        animal,
        'ubicación',
        animal.currentAreaId ? 'Asignado a un área de la granja' : 'Sin área asignada',
      )
    }
    if (animal.driedAt) {
      addMovement(animal.driedAt, animal, 'lactancia', 'Lactancia finalizada')
    }
    if (animal.availableToSaleAt) {
      addMovement(animal.availableToSaleAt, animal, 'venta', 'Marcado como disponible para venta')
    }
    if (animal.soldInfo?.date) {
      addMovement(animal.soldInfo.date, animal, 'venta', 'Venta registrada')
    }
    if (animal.lostInfo?.lostAt) {
      addMovement(animal.lostInfo.lostAt, animal, 'pérdida', 'Animal marcado como perdido')
    }
    if (animal.lostInfo?.foundAt) {
      addMovement(animal.lostInfo.foundAt, animal, 'ubicación', 'Animal marcado como encontrado')
    }
  }
  recentMovements.sort((a, b) => b.momento.localeCompare(a.momento))

  const pregnancyPendingFemales = pregnancyCandidates.reduce(
    (total, record) => total + record.hembrasPendientes.length,
    0,
  )
  const sortedExpectedBirths = expectedBirths.sort(
    (a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999),
  )

  const recommendedActions: {
    prioridad: 'alta' | 'media' | 'informativa'
    accion: string
    motivo: string
    animales?: string[]
    enlace: string
  }[] = []
  const overdueBirths = sortedExpectedBirths.filter(
    (birth) => birth.diasRestantes !== null && birth.diasRestantes < 0,
  )
  const upcomingBirths = sortedExpectedBirths.filter(
    (birth) => birth.diasRestantes !== null && birth.diasRestantes >= 0 && birth.diasRestantes <= 7,
  )
  const overdueWeaning = pendingWeaningRows.filter(
    (row) => row.diasRestantes !== null && row.diasRestantes < 0,
  )
  const upcomingWeaning = pendingWeaningRows.filter(
    (row) => row.diasRestantes !== null && row.diasRestantes >= 0 && row.diasRestantes <= 7,
  )
  if (overdueBirths.length > 0) {
    recommendedActions.push({
      prioridad: 'alta',
      accion: 'Revisar y registrar partos vencidos',
      motivo: `${overdueBirths.length} parto(s) superaron la fecha esperada. Confirma primero que el parto ocurrió; si hay signos de alarma, contacta a un veterinario.`,
      animales: overdueBirths.map((birth) => birth.hembra).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos',
    })
  }
  if (upcomingBirths.length > 0) {
    recommendedActions.push({
      prioridad: 'media',
      accion: 'Preparar próximos partos',
      motivo: `${upcomingBirths.length} parto(s) están previstos en los próximos 7 días.`,
      animales: upcomingBirths.map((birth) => birth.hembra).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=embarazos',
    })
  }
  if (overdueWeaning.length > 0) {
    recommendedActions.push({
      prioridad: 'alta',
      accion: 'Revisar destetes vencidos',
      motivo: `${overdueWeaning.length} cría(s) superaron la fecha estimada de destete. La fecha es orientativa; valida condición y manejo antes de registrar.`,
      animales: overdueWeaning.map((row) => row.numero).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria',
    })
  } else if (upcomingWeaning.length > 0) {
    recommendedActions.push({
      prioridad: 'media',
      accion: 'Planear próximos destetes',
      motivo: `${upcomingWeaning.length} cría(s) alcanzan su fecha estimada en los próximos 7 días.`,
      animales: upcomingWeaning.map((row) => row.numero).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=cria',
    })
  }
  if (pregnancyPendingFemales > 0) {
    recommendedActions.push({
      prioridad: 'media',
      accion: 'Confirmar resultado de empadres',
      motivo: `${pregnancyPendingFemales} hembra(s) siguen pendientes de confirmar gestación.`,
      animales: pregnancyCandidates.flatMap((record) => record.hembrasPendientes).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=empadre',
    })
  }
  if (dairyFemalesWithoutMilkToday.length > 0) {
    recommendedActions.push({
      prioridad: 'informativa',
      accion: 'Completar registros de ordeño de hoy',
      motivo: `${dairyFemalesWithoutMilkToday.length} lechera(s) activas de producción o doble propósito no tienen ordeño registrado hoy.`,
      animales: dairyFemalesWithoutMilkToday.map((animal) => animal.animalNumber).slice(0, 20),
      enlace: '/?dashboard-main=animales&animals-section=etapas&animals-etapas=crias_lactantes',
    })
  }
  const todayKey = dateKey(today) || ''
  const overdueReminders = reminders.filter(
    (reminder) => reminder.fecha !== null && reminder.fecha < todayKey,
  )
  if (overdueReminders.length > 0) {
    recommendedActions.push({
      prioridad: 'alta',
      accion: 'Atender recordatorios vencidos',
      motivo: `${overdueReminders.length} recordatorio(s) tienen una fecha anterior a hoy.`,
      animales: Array.from(
        new Set(overdueReminders.flatMap((reminder) => reminder.animales)),
      ).slice(0, 20),
      enlace: '/?dashboard-main=recordatorios',
    })
  }

  const summary = {
    animales: access.animals
      ? {
          disponible: true,
          totalRegistrados: farmAnimals.length,
          activos: activeAnimals.length,
          inactivos: farmAnimals.length - activeAnimals.length,
          porEstado: countBy(farmAnimals.map((animal) => animal.status || 'activo')),
          porEspecie: countBy(activeAnimals.map((animal) => animal.type)),
          porGenero: countBy(activeAnimals.map((animal) => animal.gender)),
          porEtapaCalculada: countBy(
            activeAnimals.map((animal) => animal.computedStage || animal.stage) as AnimalStageKey[],
          ),
        }
      : { disponible: false },
    reproduccion:
      access.animals && access.breeding
        ? {
            disponible: true,
            empadresActivos: farmBreedingRecords.filter(
              (record) => (record.status || 'active') !== 'finished',
            ).length,
            hembrasEnEmpadresActivos: new Set(
              farmBreedingRecords
                .filter((record) => (record.status || 'active') !== 'finished')
                .flatMap((record) => record.femaleBreedingInfo.map((info) => info.femaleId)),
            ).size,
            embarazosPendientesParto: expectedBirths.length,
            hembrasPendientesConfirmarEmbarazo: pregnancyPendingFemales,
            madresLactantes: nursingMothers.length,
          }
        : { disponible: false },
    lactancia: access.animals
      ? {
          disponible: true,
          hembrasActivas: lactatingFemales.length,
          paraCrias: lactatingFemales.filter((animal) => animal.lactationPurpose === 'offspring')
            .length,
          produccionLeche: lactatingFemales.filter((animal) => animal.lactationPurpose === 'dairy')
            .length,
          dobleProposito: lactatingFemales.filter((animal) => animal.lactationPurpose === 'dual')
            .length,
          ordeñosHoy: milkToday.length,
          litrosHoy: litersFromMl(
            milkToday.reduce((total, { entry }) => total + Number(entry.amountMl || 0), 0),
          ),
          ordeñosUltimos7Dias: milkLast7Days.length,
          litrosUltimos7Dias: litersFromMl(
            milkLast7Days.reduce((total, { entry }) => total + Number(entry.amountMl || 0), 0),
          ),
          lecherasSinRegistroHoy: dairyFemalesWithoutMilkToday.length,
        }
      : { disponible: false },
    destetes: access.animals
      ? {
          disponible: true,
          pendientes: pendingWeaningRows.length,
          vencidos: pendingWeaningRows.filter(
            (row) => row.diasRestantes !== null && row.diasRestantes < 0,
          ).length,
          proximos7Dias: pendingWeaningRows.filter(
            (row) => row.diasRestantes !== null && row.diasRestantes >= 0 && row.diasRestantes <= 7,
          ).length,
          sinFechaNacimiento: pendingWeaningRows.filter((row) => row.fechaNacimiento === null)
            .length,
          proximos: pendingWeaningRows.slice(0, 20),
          madres: nursingMothers.slice(0, 20),
        }
      : { disponible: false },
    recordatorios: access.reminders
      ? {
          disponible: true,
          pendientes: reminders.length,
          vencidos: overdueReminders.length,
          proximos7Dias: reminders.filter((reminder) => {
            if (!reminder.fecha) return false
            const dueDate = asDate(`${reminder.fecha}T12:00:00`)
            if (!dueDate) return false
            const days = daysUntil(today, dueDate)
            return days >= 0 && days <= 7
          }).length,
        }
      : { disponible: false },
    movimientos: access.animals
      ? {
          disponible: true,
          totalDetectados: recentMovements.length,
          porTipo: countBy(recentMovements.map((movement) => movement.tipo)),
          ultimo: recentMovements[0] || null,
        }
      : { disponible: false },
  }

  // Recorte por relevancia: el resumen (autoritativo) va siempre; los arreglos
  // crudos solo cuando la pregunta los necesita.
  const {
    wantsAnimalList,
    wantsBreeding,
    wantsMilk,
    wantsMovements,
    wantsGuidance,
    referencedAnimals,
  } = selectRelevance(message, animals)
  const animalsForContext = referencedAnimals.length
    ? referencedAnimals
    : wantsAnimalList
      ? animals.slice(0, 150)
      : []
  const animalsOmitidos = animals.length - animalsForContext.length
  const referencedNumbers = new Set(referencedAnimals.map((animal) => animal.numero))
  const movementsForContext = referencedNumbers.size
    ? recentMovements.filter((movement) => referencedNumbers.has(movement.animal)).slice(0, 40)
    : wantsMovements || wantsGuidance
      ? recentMovements.slice(0, 40)
      : []
  const milkByAnimal = lactatingFemales
    .map((animal) => {
      const entries = milkEntries.filter(({ animal: owner }) => owner.id === animal.id)
      const todayEntries = entries.filter(
        ({ date }) => date && startOfDay(date).getTime() === todayStart.getTime(),
      )
      const lastEntry = [...entries].sort(
        (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0),
      )[0]
      return {
        animal: animal.animalNumber,
        proposito: animal.lactationPurpose || null,
        criasActivas: activeUnweanedOffspring({ farmAnimals, motherId: animal.id }).map(
          (offspring) => offspring.animalNumber,
        ),
        ordeñosHoy: todayEntries.length,
        litrosHoy: litersFromMl(
          todayEntries.reduce((total, { entry }) => total + Number(entry.amountMl || 0), 0),
        ),
        ultimoOrdeño: lastEntry
          ? {
              fecha: dateKey(lastEntry.entry.date),
              litros: litersFromMl(lastEntry.entry.amountMl),
              turno: lastEntry.entry.session,
            }
          : null,
      }
    })
    .slice(0, 100)
  const priorityOrder = { alta: 0, media: 1, informativa: 2 } as const
  recommendedActions.sort((a, b) => priorityOrder[a.prioridad] - priorityOrder[b.prioridad])

  return {
    versionContexto: 2,
    generadoEn: today.toISOString(),
    permisosContexto: access,
    nota: 'Instantánea leída directamente de Firestore para esta granja. Las cifras provienen SIEMPRE de resumen.*; no cuentes arreglos manualmente. etapaCalculada es la condición vigente mostrada por la app y puede coexistir con lactancia, empadre o gestación. Si falta un dato, dilo explícitamente.',
    resumen: summary,
    animalsIncluidos: animalsForContext.length > 0,
    animalsOmitidos: animalsOmitidos > 0 ? animalsOmitidos : 0,
    animals: animalsForContext.map(({ id: _internalId, ...animal }) => animal),
    reminders,
    breedingRecords: wantsBreeding ? breedingRecords : [],
    movimientosIncluidos: movementsForContext.length > 0,
    movimientosRecientes: movementsForContext,
    accionesRecomendadas: recommendedActions.slice(0, 12),
    lactancia: wantsMilk || wantsGuidance || referencedAnimals.length > 0 ? milkByAnimal : [],
    reproductiveFlows: {
      embarazadas: expectedBirths.length,
      registrarEmbarazo: {
        botonVisibleEn: 'Animales > Etapas > Gestantes',
        hembrasPendientes: pregnancyPendingFemales,
        empadresDisponibles: pregnancyCandidates.length,
        candidatos: pregnancyCandidates.slice(0, 10),
        siNoHayPendientes:
          'El boton sigue visible; al abrirlo informa que no hay hembras en reproduccion pendientes de confirmar y sugiere crear un empadre.',
      },
      registrarParto: {
        botonVisibleEn: 'Animales > Etapas > Gestantes',
        partosPrevistos: expectedBirths.length,
        proximosPartos: sortedExpectedBirths.slice(0, 20),
        siNoHayPartos:
          'El boton abre un selector simple; si no hay partos previstos, indica que primero debe confirmarse una gestación desde un empadre.',
      },
      registrarLeche: {
        botonVisibleEn: 'Animales > Etapas > Madre/Lechera, acción Leche',
        hembrasConLactanciaActiva: lactatingFemales.length,
        registrosHoy: milkToday.length,
        lecherasSinRegistroHoy: dairyFemalesWithoutMilkToday.map((animal) => animal.animalNumber),
        historialVisibleEn:
          'Detalle del animal > Registros > Leche. Finalizar lactancia conserva todo el historial.',
      },
    },
  }
}
