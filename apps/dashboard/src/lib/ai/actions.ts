import { Timestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { Reminder } from '@/types'
import { Animal } from '@/types/animals'
import { BreedingRecord } from '@/types/breedings'
import type { FarmPermission } from '@/types/farm'
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
  const q = ref.trim().toLowerCase()
  const matches = animals.filter((animal) => {
    return (
      animal.id.toLowerCase() === q ||
      animal.animalNumber?.toLowerCase() === q ||
      animal.name?.toLowerCase() === q
    )
  })
  if (matches.length === 0) throw new Error(`No encontré el animal "${ref}" en esta granja`)
  if (matches.length > 1)
    throw new Error(`"${ref}" coincide con más de un animal. Usa el número exacto`)
  return matches[0]
}

function generateBreedingId(breedingDate: Date, records: BreedingRecord[]): string {
  const day = String(breedingDate.getDate()).padStart(2, '0')
  const month = String(breedingDate.getMonth() + 1).padStart(2, '0')
  const year = String(breedingDate.getFullYear()).slice(-2)
  const baseId = `${day}-${month}-${year}`
  const sameDate = records.filter((record) => {
    if (!record.breedingDate) return false
    const date =
      record.breedingDate instanceof Date
        ? record.breedingDate
        : (record.breedingDate as unknown as Timestamp).toDate()
    return date.toDateString() === breedingDate.toDateString()
  })
  return `${baseId}-${String(sameDate.length + 1).padStart(2, '0')}`
}

async function getFarmBreedingRecords(farmId: string): Promise<BreedingRecord[]> {
  const firestore = getAdminFirestore()
  const snap = await firestore.collection('breedingRecords').where('farmId', '==', farmId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BreedingRecord)
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
    throw new Error('No tienes permiso para registrar montas')
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

  return { message: `Monta registrada con ${females.length} hembra(s)` }
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

  const activeRecords = records.filter((record) =>
    record.femaleBreedingInfo?.some(
      (info) => info.femaleId === mother.id && info.pregnancyConfirmedDate && !info.actualBirthDate,
    ),
  )
  if (activeRecords.length === 0) {
    throw new Error(`No hay embarazo confirmado activo para ${mother.animalNumber}`)
  }
  if (activeRecords.length > 1) {
    throw new Error(`${mother.animalNumber} tiene más de un empadre activo. Revísalo manualmente`)
  }

  for (const offspring of payload.offspring) {
    if (animals.some((animal) => animal.animalNumber === offspring.animalNumber)) {
      throw new Error(`Ya existe un animal con número ${offspring.animalNumber}`)
    }
  }

  const record = activeRecords[0]
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
      fatherId: record.maleId,
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
  batch.update(firestore.collection('animals').doc(mother.id), {
    birthedAt: Timestamp.fromDate(birthDate),
    pregnantAt: null,
    pregnantBy: null,
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

  await firestore.collection('breedingRecords').doc(matches[0].id).update({
    status: 'finished',
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

export async function buildAiContext(farmId: string) {
  const firestore = getAdminFirestore()
  const [animalsSnap, remindersSnap, breedingSnap] = await Promise.all([
    firestore.collection('animals').where('farmId', '==', farmId).limit(500).get(),
    firestore
      .collection('reminders')
      .where('farmId', '==', farmId)
      .where('completed', '==', false)
      .limit(40)
      .get(),
    firestore.collection('breedingRecords').where('farmId', '==', farmId).limit(40).get(),
  ])

  const animals = animalsSnap.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      numero: data.animalNumber,
      nombre: data.name || '',
      especie: data.type,
      genero: data.gender,
      etapa: data.stage,
      estado: data.status || 'activo',
      fechaEmbarazo: data.pregnantAt?.toDate?.()?.toISOString().slice(0, 10) || null,
      fechaParto: data.birthedAt?.toDate?.()?.toISOString().slice(0, 10) || null,
    }
  })

  const reminders = remindersSnap.docs.map((doc) => {
    const data = doc.data()
    const dueDate = data.dueDate?.toDate?.() ? data.dueDate.toDate() : new Date(data.dueDate)
    return {
      id: doc.id,
      titulo: data.title,
      fecha: dueDate.toISOString().slice(0, 10),
      prioridad: data.priority || 'medium',
      tipo: data.type || 'other',
      animales: data.animalNumbers || [],
    }
  })

  const breedingRecords = breedingSnap.docs.map((doc) => {
    const data = doc.data()
    const male = animals.find((animal) => animal.id === data.maleId)
    return {
      id: data.breedingId || doc.id,
      estado: data.status || 'active',
      macho: male?.numero || 'sin macho visible',
      fecha: data.breedingDate?.toDate?.()?.toISOString().slice(0, 10) || null,
      hembras: (data.femaleBreedingInfo || []).map((info: Record<string, unknown>) => ({
        hembra:
          animals.find((animal) => animal.id === info.femaleId)?.numero || 'sin numero visible',
        embarazoConfirmado: Boolean(info.pregnancyConfirmedDate),
        fechaEsperada:
          (info.expectedBirthDate as Timestamp | undefined)
            ?.toDate?.()
            ?.toISOString()
            .slice(0, 10) || null,
        parto: Boolean(info.actualBirthDate),
        fechaParto:
          (info.actualBirthDate as Timestamp | undefined)?.toDate?.()?.toISOString().slice(0, 10) ||
          null,
      })),
    }
  })

  return { animals, reminders, breedingRecords }
}
