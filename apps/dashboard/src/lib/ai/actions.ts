import {
  activeUnweanedOffspring,
  computeAnimalEffectiveStage,
  getWeaningDueDate,
  getWeaningStatusFromDays,
  isActiveCalf,
} from '@/lib/animal-utils'
import { calculateExpectedBirthDate } from '@/lib/animalBreedingConfig'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { Animal, type AnimalStageKey, isActivePregnancy, isMilkRecord } from '@/types/animals'
import { BreedingRecord, type FemaleBreedingInfo } from '@/types/breedings'
import { selectRelevance } from './context-relevance'
import { asAiDate as asDate, normalizeAiReminder } from './context-serialization'
import {
  knowledgeCalendarDay,
  knowledgeDateKey,
  knowledgeDaysUntil,
  knowledgeTimeZone,
} from './knowledge-dates'
import { mergeKnowledgeAnimalRecords } from './knowledge-records'

function normalizeAnimal(doc: FirebaseFirestore.QueryDocumentSnapshot): Animal {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
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
    soldInfo: data.soldInfo ? { ...data.soldInfo, date: asDate(data.soldInfo.date) } : undefined,
    lostInfo: data.lostInfo
      ? {
          ...data.lostInfo,
          lostAt: asDate(data.lostInfo.lostAt),
          foundAt: asDate(data.lostInfo.foundAt),
        }
      : undefined,
    records: Array.isArray(data.records)
      ? data.records.map((entry: Record<string, unknown>) => ({
          ...entry,
          date: asDate(entry.date) ?? new Date(0),
          createdAt: asDate(entry.createdAt) ?? asDate(entry.date) ?? new Date(0),
          nextDueDate: asDate(entry.nextDueDate) ?? undefined,
          undoneAt: asDate(entry.undoneAt) ?? undefined,
        }))
      : [],
  } as Animal
}

function normalizeBreedingRecord(doc: FirebaseFirestore.QueryDocumentSnapshot): BreedingRecord {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
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

export type AiContextTopic =
  | 'animals'
  | 'breedings'
  | 'weaning'
  | 'births'
  | 'movements'
  | 'milk'
  | 'reminders'
export interface AiContextPage {
  topic?: AiContextTopic
  offset?: number
  limit?: number
  timeZone?: string
}

export async function buildAiContext(
  farmId: string,
  message = '',
  access: AiContextAccess = { animals: true, reminders: true, breeding: true },
  page?: AiContextPage,
) {
  const firestore = getAdminFirestore()
  const timeZone = knowledgeTimeZone(page?.timeZone)
  const dateKey = (value: unknown) => knowledgeDateKey(value, timeZone)
  const startOfDay = (value: Date) => knowledgeCalendarDay(value, timeZone)!
  const daysUntil = (from: Date, to: Date) => knowledgeDaysUntil(from, to, timeZone)!
  const offsetValue = Number.isFinite(page?.offset) ? Math.max(0, Math.floor(page?.offset ?? 0)) : 0
  const paginate = <T>(topic: AiContextTopic, rows: T[], defaultLimit: number): T[] => {
    const offset = page?.topic === topic ? offsetValue : 0
    const limit =
      page?.topic === topic
        ? Math.max(
            1,
            Math.min(
              150,
              Number.isFinite(page.limit) ? Math.floor(page.limit || defaultLimit) : defaultLimit,
            ),
          )
        : defaultLimit
    return rows.slice(offset, offset + limit)
  }
  const [animalsSnap, remindersSnap, breedingSnap, centralSnap, movementSnap] = await Promise.all([
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
    access.animals && access.breeding
      ? firestore.collection('breedingRecords').where('farmId', '==', farmId).get()
      : Promise.resolve(null),
    access.animals
      ? firestore.collection('animalRecords').where('farmId', '==', farmId).get()
      : Promise.resolve(null),
    access.animals
      ? firestore.collection('recordMovements').where('farmId', '==', farmId).get()
      : Promise.resolve(null),
  ])

  const today = new Date()
  const farmAnimals = mergeKnowledgeAnimalRecords(
    animalsSnap?.docs.map(normalizeAnimal) ?? [],
    (centralSnap?.docs ?? []).map((doc) => ({ id: doc.id, data: doc.data() })),
    (movementSnap?.docs ?? []).map((doc) => ({ id: doc.id, data: doc.data() })),
    farmId,
  )
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

  const reminders = (remindersSnap?.docs ?? []).map((doc) => ({
    ...normalizeAiReminder(doc.id, doc.data()),
    fecha: dateKey(doc.data().dueDate),
  }))

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
      .filter((info: FemaleBreedingInfo) => {
        const female = farmAnimals.find((animal) => animal.id === info.femaleId)
        return (
          female &&
          (female.status ?? 'activo') === 'activo' &&
          !female.pregnantAt &&
          !info.pregnancyConfirmedDate &&
          !info.actualBirthDate
        )
      })
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

  if (access.breeding)
    for (const female of activeAnimals.filter(isActivePregnancy)) {
      const pregnancyDate = dateKey(female.pregnantAt)
      const origin = farmBreedingRecords.find(
        (record) =>
          record.id === female.pregnantBreedingRecordId ||
          record.femaleBreedingInfo.some(
            (info) =>
              info.femaleId === female.id &&
              !info.actualBirthDate &&
              dateKey(info.pregnancyConfirmedDate) === pregnancyDate,
          ),
      )
      const info = origin?.femaleBreedingInfo.find(
        (info) => info.femaleId === female.id && !info.actualBirthDate,
      )
      const [year, month, day] = (pregnancyDate || '').split('-').map(Number)
      const calculated = pregnancyDate
        ? calculateExpectedBirthDate(new Date(year, month - 1, day, 12), female.type)
        : null
      const expectedKey = info?.expectedBirthDate
        ? dateKey(info.expectedBirthDate)
        : calculated
          ? `${calculated.getFullYear()}-${String(calculated.getMonth() + 1).padStart(2, '0')}-${String(calculated.getDate()).padStart(2, '0')}`
          : null
      expectedBirths.push({
        hembra: female.animalNumber,
        macho: visibleAnimalNumber(female.pregnantBy || origin?.maleId) || 'No registrado',
        empadre: origin?.breedingId || female.pregnantBreedingId || 'Sin empadre vinculado',
        fechaEsperada: expectedKey,
        diasRestantes: expectedKey ? knowledgeDaysUntil(today, expectedKey, timeZone) : null,
      })
    }

  const pendingWeaningRows = activeAnimals
    .filter(isActiveCalf)
    .map((animal) => {
      const birthKey = dateKey(animal.birthDate)
      const [year, month, day] = (birthKey || '').split('-').map(Number)
      const weanDate = getWeaningDueDate({
        ...animal,
        birthDate: birthKey ? new Date(year, month - 1, day, 12) : undefined,
      })
      const dueKey = weanDate
        ? `${weanDate.getFullYear()}-${String(weanDate.getMonth() + 1).padStart(2, '0')}-${String(weanDate.getDate()).padStart(2, '0')}`
        : null
      const weaningStatus = getWeaningStatusFromDays(
        dueKey ? knowledgeDaysUntil(today, dueKey, timeZone) : null,
      )
      const mother = farmAnimals.find(
        (candidate) =>
          candidate.id === animal.motherId || candidate.animalNumber === animal.motherId,
      )
      return {
        numero: animal.animalNumber,
        madre: mother?.animalNumber || null,
        especie: animal.type,
        fechaNacimiento: dateKey(animal.birthDate),
        fechaDesteteEstimada: dueKey,
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
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
  const milkEntries = farmAnimals.flatMap((animal) =>
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
    id: string
    animales: string[]
    fecha: string
    momento: string
    animal: string
    tipo: string
    detalle: string
  }[] = []
  const addMovement = (
    date: unknown,
    animal: Animal,
    type: string,
    detail: string,
    recordId?: string,
  ) => {
    const movementDate = asDate(date)
    if (!movementDate) return
    const id = recordId || `${animal.id}:${type}:${movementDate.toISOString()}`
    const existing = recentMovements.find((movement) => movement.id === id)
    if (existing) {
      if (!existing.animales.includes(animal.animalNumber))
        existing.animales.push(animal.animalNumber)
      return
    }
    recentMovements.push({
      id,
      animales: [animal.animalNumber],
      fecha: dateKey(movementDate) || '',
      momento: movementDate.toISOString(),
      animal: animal.animalNumber,
      tipo: type,
      detalle: detail.slice(0, 240),
    })
  }
  for (const animal of farmAnimals) {
    for (const record of animal.records || []) {
      if (record.undoneAt) continue
      const detail = isMilkRecord(record)
        ? `${litersFromMl(record.amountMl)} L · ${record.session}${record.notes ? ` · ${record.notes}` : ''}`
        : `${record.title}${record.notes ? ` · ${record.notes}` : ''}`
      addMovement(
        record.date,
        animal,
        record.type === 'milk' ? 'ordeño' : record.eventType || `registro_${record.type}`,
        detail,
        record.id,
      )
    }
    if (animal.statusAt) {
      addMovement(animal.statusAt, animal, 'estado', animal.status || 'activo')
    }
    if (
      animal.weanedAt &&
      !(animal.records || []).some(
        (record) =>
          !record.undoneAt &&
          record.eventType === 'destete' &&
          dateKey(record.date) === dateKey(animal.weanedAt),
      )
    ) {
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
      (record) =>
        !record.undoneAt &&
        (record.type === 'birth' || record.eventType === 'parto') &&
        dateKey(record.date) === dateKey(animal.birthedAt),
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
      enlace: '/?dashboard-main=empadres',
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
          proximos: paginate('weaning', pendingWeaningRows, 20),
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
  const animalsLoaded = wantsAnimalList || referencedAnimals.length > 0 || page?.topic === 'animals'
  const animalsPool = referencedAnimals.length ? referencedAnimals : animals
  const animalsForContext = animalsLoaded ? paginate('animals', animalsPool, 150) : []
  const animalsOmitidos = animalsPool.length - animalsForContext.length
  const referencedNumbers = new Set(referencedAnimals.map((animal) => animal.numero))
  const movementsPool = referencedNumbers.size
    ? recentMovements.filter((movement) =>
        movement.animales.some((number) => referencedNumbers.has(number)),
      )
    : recentMovements
  const movementsLoaded =
    referencedNumbers.size > 0 || wantsMovements || wantsGuidance || page?.topic === 'movements'
  const movementsForContext = movementsLoaded ? paginate('movements', movementsPool, 40) : []
  const milkByAnimal = lactatingFemales.map((animal) => {
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
  const priorityOrder = { alta: 0, media: 1, informativa: 2 } as const
  recommendedActions.sort((a, b) => priorityOrder[a.prioridad] - priorityOrder[b.prioridad])

  const loadedBreeding = wantsBreeding || wantsGuidance || page?.topic === 'breedings'
  const loadedMilk =
    wantsMilk || wantsGuidance || referencedAnimals.length > 0 || page?.topic === 'milk'
  const coverage = (
    topic: AiContextTopic,
    total: number,
    returned: number,
    available: boolean,
    loaded = true,
  ) => {
    const offset = page?.topic === topic ? offsetValue : 0
    return {
      available,
      loaded: available && loaded,
      total: available ? total : null,
      returned: available ? returned : 0,
      offset,
      hasMore: available && offset + returned < total,
      cursor: available && loaded && offset + returned < total ? String(offset + returned) : null,
    }
  }
  const breedingPage = loadedBreeding ? paginate('breedings', breedingRecords, 100) : []
  const milkPage = loadedMilk ? paginate('milk', milkByAnimal, 100) : []
  const reminderPage = paginate('reminders', reminders, 100)
  const weaningPage = paginate('weaning', pendingWeaningRows, 20)
  const birthPage = paginate('births', sortedExpectedBirths, 20)
  return {
    versionContexto: 3,
    zonaHoraria: timeZone,
    cobertura: {
      animals: coverage(
        'animals',
        animalsPool.length,
        animalsForContext.length,
        access.animals,
        animalsLoaded,
      ),
      breedings: coverage(
        'breedings',
        breedingRecords.length,
        breedingPage.length,
        access.animals && access.breeding,
        loadedBreeding,
      ),
      weaning: coverage('weaning', pendingWeaningRows.length, weaningPage.length, access.animals),
      births: coverage(
        'births',
        sortedExpectedBirths.length,
        birthPage.length,
        access.animals && access.breeding,
      ),
      milk: coverage('milk', milkByAnimal.length, milkPage.length, access.animals, loadedMilk),
      movements: coverage(
        'movements',
        movementsPool.length,
        movementsForContext.length,
        access.animals,
        movementsLoaded,
      ),
      reminders: coverage('reminders', reminders.length, reminderPage.length, access.reminders),
    },
    generadoEn: today.toISOString(),
    permisosContexto: access,
    nota: 'Instantánea leída directamente de Firestore para esta granja. Las cifras provienen SIEMPRE de resumen.*; no cuentes arreglos manualmente. etapaCalculada es la condición vigente mostrada por la app y puede coexistir con lactancia, empadre o gestación. Si falta un dato, dilo explícitamente.',
    resumen: summary,
    animalesReferenciados: referencedAnimals.map((animal) => animal.numero),
    animalsIncluidos: access.animals && animalsLoaded,
    animalsOmitidos: animalsOmitidos > 0 ? animalsOmitidos : 0,
    animals: animalsForContext.map(({ id: _internalId, ...animal }) => animal),
    reminders: reminderPage,
    breedingRecords: breedingPage,
    movimientosIncluidos: movementsForContext.length > 0,
    movimientosRecientes: movementsForContext,
    accionesRecomendadas: recommendedActions.slice(0, 12),
    lactancia: milkPage,
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
        proximosPartos: birthPage,
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
