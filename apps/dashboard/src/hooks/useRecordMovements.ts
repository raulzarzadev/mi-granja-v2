import { useSelector } from 'react-redux'
import type { SaleCompletionSummary } from '@/components/ModalSaleForm'
import type { RootState } from '@/features/store'
import { animalDeathReasonLabels } from '@/lib/animal-discharge'
import {
  commitMovement,
  type MovementChange,
  type MovementPlan,
  undoMovement,
} from '@/lib/record-movements'
import type { BirthRecord } from '@/types'
import type { Animal, AnimalDeathReason, AnimalRecord, MilkingSession } from '@/types/animals'
import type { BreedingRecord } from '@/types/breedings'

export function useRecordMovements(animals: Animal[] = []) {
  const { user } = useSelector((s: RootState) => s.auth)
  const { currentFarm } = useSelector((s: RootState) => s.farm)
  const context = { userId: user?.id ?? '', farmId: currentFarm?.id ?? '' }
  const validateDate = (date: Date) => {
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now())
      throw new Error('La fecha debe ser válida y no estar en el futuro.')
  }
  const active = (animal: any) => {
    if (!animal || (animal.status ?? 'activo') !== 'activo')
      throw new Error('Selecciona animales activos.')
  }
  const execute = (
    id: string,
    ids: string[],
    extra: string[],
    build: Parameters<typeof commitMovement>[4],
  ) => commitMovement(context, id, ids, extra, build)

  return {
    context,
    undo: (record: AnimalRecord) => undoMovement(context, record),
    death: (id: string, ids: string[], date: Date, reason: AnimalDeathReason, notes: string) => {
      validateDate(date)
      if (!animalDeathReasonLabels[reason]) throw new Error('Selecciona el motivo de la muerte.')
      return execute(id, ids, [], (docs) => {
        const changes = ids.map((animalId) => {
          active(docs.get(`animals/${animalId}`))
          return {
            path: `animals/${animalId}`,
            data: {
              status: 'muerto',
              statusAt: date,
              statusNotes: [animalDeathReasonLabels[reason], notes].filter(Boolean).join(' · '),
              deathInfo: { reason, date, description: notes },
            },
          }
        })
        return {
          changes,
          record: {
            type: 'event',
            category: 'other',
            eventType: 'muerte',
            title: 'Muerte registrada',
            date,
            description: notes,
            notes,
            details: { Motivo: animalDeathReasonLabels[reason] },
          },
        }
      })
    },
    wean: (
      id: string,
      ids: string[],
      date: Date,
      destination: 'engorda' | 'reproductor',
      notes: string,
    ) => {
      validateDate(date)
      const mothers = animals.filter((a) =>
        ids.some((childId) => {
          const child = animals.find((c) => c.id === childId)
          return child?.motherId === a.id || child?.motherId === a.animalNumber
        }),
      )
      const siblings = animals.filter((a) =>
        mothers.some((m) => a.motherId === m.id || a.motherId === m.animalNumber),
      )
      return execute(
        id,
        ids,
        [...mothers, ...siblings].map((a) => `animals/${a.id}`),
        (docs) => {
          const changes: MovementChange[] = ids.map((animalId) => {
            const animal = docs.get(`animals/${animalId}`)
            active(animal)
            if (animal?.isWeaned || animal?.stage !== 'cria')
              throw new Error('Solo se pueden destetar crías activas sin destetar.')
            return {
              path: `animals/${animalId}`,
              data: {
                isWeaned: true,
                weanedAt: date,
                stage: destination === 'engorda' ? 'engorda' : 'juvenil',
                weaningDestination: destination,
              },
            }
          })
          for (const mother of mothers) {
            const current = docs.get(`animals/${mother.id}`)
            if (!current) throw new Error('Madre no encontrada.')
            const remains = siblings.some((s) => {
              const child = docs.get(`animals/${s.id}`)
              return (
                !ids.includes(s.id) &&
                child &&
                (child.status ?? 'activo') === 'activo' &&
                !child.isWeaned &&
                child.stage === 'cria' &&
                (child.motherId === mother.id || child.motherId === mother.animalNumber)
              )
            })
            if (!remains)
              changes.push({
                path: `animals/${mother.id}`,
                data: {
                  weanedMotherAt: date,
                  ...(current.lactationPurpose === 'dairy' || current.lactationPurpose === 'dual'
                    ? { lactationStatus: 'active' }
                    : { lactationStatus: 'dry', birthedAt: null, driedAt: date }),
                },
              })
          }
          return {
            changes,
            record: {
              type: 'event',
              category: 'other',
              eventType: 'destete',
              title: 'Destete registrado',
              date,
              notes,
              description: notes,
              details: {
                Destino: destination === 'engorda' ? 'Engorda' : 'Juvenil para reproducción',
              },
            },
          }
        },
      )
    },
    breeding: (
      id: string,
      data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
    ) => {
      const date = data.breedingDate ? new Date(data.breedingDate) : new Date()
      validateDate(date)
      const femaleIds = data.femaleBreedingInfo.map((f) => f.femaleId)
      if (!femaleIds.length || femaleIds.includes(data.maleId))
        throw new Error('Selecciona un macho y hembras compatibles.')
      const ids = [data.maleId, ...new Set(femaleIds)]
      const path = `breedingRecords/${id}`
      return execute(id, ids, [path], (docs) => {
        const male = docs.get(`animals/${data.maleId}`)
        active(male)
        if (male?.gender !== 'macho') throw new Error('Selecciona un macho reproductor.')
        const changes: MovementChange[] = ids.map((animalId) => ({
          path: `animals/${animalId}`,
          data: {},
        }))
        for (const info of data.femaleBreedingInfo) {
          const female = docs.get(`animals/${info.femaleId}`)
          active(female)
          if (female?.gender !== 'hembra' || female.type !== male?.type || female.pregnantAt)
            throw new Error('Las hembras deben ser compatibles y no tener gestación activa.')
          if (info.pregnancyConfirmedDate) {
            changes.find((c) => c.path === `animals/${info.femaleId}`)!.data = {
              pregnantAt: new Date(info.pregnancyConfirmedDate),
              pregnantBy: data.maleId,
              pregnantBreedingRecordId: id,
              pregnantBreedingId: data.breedingId ?? '',
            }
          }
        }
        changes.push({
          path,
          create: true,
          data: {
            ...data,
            breedingDate: date,
            farmId: context.farmId,
            farmerId: context.userId,
            createdAt: new Date(),
            status: data.status ?? 'active',
          },
        })
        return {
          changes,
          record: {
            type: 'event',
            category: 'other',
            eventType: 'monta',
            title: `Empadre ${data.breedingId ?? ''}`.trim(),
            date,
            notes: data.notes ?? '',
            description: data.notes ?? '',
            details: {
              Macho: male?.animalNumber ?? data.maleId,
              Hembras: femaleIds.map((f) => docs.get(`animals/${f}`)?.animalNumber ?? f).join(', '),
              'ID de empadre': data.breedingId ?? id,
            },
          },
        }
      })
    },
    sale: (id: string, summary: SaleCompletionSummary) => {
      validateDate(summary.date)
      const path = `sales/${id}`
      return execute(id, summary.animalIds, [path], (docs) => {
        if (!(summary.pricePerKg > 0)) throw new Error('Ingresa un precio válido.')
        const changes: MovementChange[] = summary.animalIds.map((animalId) => {
          active(docs.get(`animals/${animalId}`))
          const weight = summary.animalWeights?.[animalId]
          if (!weight || weight <= 0) throw new Error('Ingresa el peso de cada animal.')
          return {
            path: `animals/${animalId}`,
            data: {
              status: 'vendido',
              statusAt: summary.date,
              availableToSaleAt: null,
              soldInfo: {
                date: summary.date,
                buyer: summary.buyer ?? '',
                weight,
                price: Math.round((summary.pricePerKg * weight) / 1000),
              },
            },
          }
        })
        changes.push({
          path,
          create: true,
          data: {
            farmId: context.farmId,
            farmerId: context.userId,
            createdBy: context.userId,
            updatedBy: context.userId,
            createdAt: new Date(),
            status: 'completed',
            date: summary.date,
            pricePerKg: summary.pricePerKg,
            priceType: summary.priceType ?? 'en_pie',
            buyer: summary.buyer ?? '',
            notes: summary.notes ?? '',
            animals: summary.animalIds.map((animalId) => ({
              animalId,
              animalNumber: docs.get(`animals/${animalId}`)?.animalNumber ?? '',
              weight: summary.animalWeights?.[animalId],
            })),
          },
        })
        return {
          changes,
          record: {
            type: 'event',
            category: 'other',
            eventType: 'venta',
            title: 'Venta registrada',
            date: summary.date,
            notes: summary.notes ?? '',
            description: summary.notes ?? '',
            details: {
              Comprador: summary.buyer || 'Sin especificar',
              'Precio por kg': `$${(summary.pricePerKg / 100).toFixed(2)}`,
              Total: `$${(summary.totalPriceCentavos / 100).toFixed(2)}`,
            },
          },
        }
      })
    },
    weight: (id: string, animalId: string, date: Date, weightGrams: number, notes: string) => {
      validateDate(date)
      if (!Number.isFinite(weightGrams) || weightGrams <= 0)
        throw new Error('Ingresa un peso mayor que cero.')
      return execute(id, [animalId], [], (docs) => {
        const animal = docs.get(`animals/${animalId}`)
        active(animal)
        const weightKg = (weightGrams / 1000).toLocaleString('es-MX', {
          maximumFractionDigits: 1,
        })
        return {
          changes: [
            {
              path: `animals/${animalId}`,
              data: { weight: weightGrams },
            },
          ],
          record: {
            type: 'weight',
            category: 'general',
            title: `${weightKg} kg`,
            date,
            weightGrams,
            notes,
            description: notes,
          },
        }
      })
    },
    milk: (
      id: string,
      animalId: string,
      date: Date,
      amountMl: number,
      session: MilkingSession,
      notes: string,
    ) => {
      validateDate(date)
      if (!Number.isFinite(amountMl) || amountMl <= 0)
        throw new Error('Ingresa una cantidad de leche mayor que cero.')
      return execute(id, [animalId], [], (docs) => {
        const animal = docs.get(`animals/${animalId}`)
        active(animal)
        if (animal?.gender !== 'hembra')
          throw new Error('Sólo se puede registrar leche en hembras.')
        const nextPurpose =
          animal.lactationPurpose === 'offspring' ? 'dual' : (animal.lactationPurpose ?? 'dairy')
        const liters = (amountMl / 1000).toLocaleString('es-MX', {
          maximumFractionDigits: 3,
        })
        const sessionLabel =
          session === 'morning' ? 'Mañana' : session === 'afternoon' ? 'Tarde' : 'Noche'
        return {
          changes: [
            {
              path: `animals/${animalId}`,
              data: {
                lactationStatus: 'active',
                lactationPurpose: nextPurpose,
                driedAt: null,
              },
            },
          ],
          record: {
            type: 'milk',
            category: 'general',
            title: `Ordeño · ${liters} L`,
            date,
            amountMl: Math.round(amountMl),
            session,
            notes,
            description: notes,
            details: { Cantidad: `${liters} L`, Turno: sessionLabel },
          },
        }
      })
    },
    birth: (id: string, form: BirthRecord, breeding: BreedingRecord | null) => {
      const date = new Date(`${form.birthDate}T${form.birthTime || '00:00'}:00`)
      validateDate(date)
      if (!form.offspring.length) throw new Error('Agrega al menos una cría.')
      const childPaths = form.offspring.map((_, i) => `animals/${id}-cria-${i}`)
      const extra = [...childPaths, ...(breeding ? [`breedingRecords/${breeding.id}`] : [])]
      return execute(id, [form.animalId], extra, (docs) => {
        const mother = docs.get(`animals/${form.animalId}`)
        active(mother)
        if (mother?.gender !== 'hembra' || !mother.pregnantAt)
          throw new Error('Selecciona una hembra con gestación activa.')
        const changes: MovementChange[] = [
          {
            path: `animals/${form.animalId}`,
            data: {
              birthedAt: date,
              lactationStatus: 'active',
              lactationPurpose:
                mother.lactationPurpose === 'dairy'
                  ? 'dual'
                  : (mother.lactationPurpose ?? 'offspring'),
              driedAt: null,
              pregnantAt: null,
              pregnantBy: null,
              pregnantBreedingRecordId: null,
              pregnantBreedingId: null,
            },
          },
        ]
        for (const [i, child] of form.offspring.entries()) {
          const kg = Number(child.weight)
          if (child.weight && (!Number.isFinite(kg) || kg < 0))
            throw new Error('Peso de cría inválido.')
          changes.push({
            path: childPaths[i],
            create: true,
            data: {
              animalNumber: child.animalNumber.trim(),
              type: mother.type,
              stage: 'cria',
              weight: kg > 0 ? Math.round(kg * 1000) : null,
              birthDate: date,
              gender: child.gender,
              motherId: form.animalId,
              fatherId: mother.pregnantBy ?? breeding?.maleId ?? null,
              notes: [child.color, child.healthIssues].filter(Boolean).join(' · '),
              status: child.status === 'muerto' ? 'muerto' : 'activo',
              ...(child.status === 'muerto' ? { statusAt: date } : {}),
              farmId: context.farmId,
              farmerId: context.userId,
              createdAt: new Date(),
            },
          })
        }
        if (breeding) {
          const current = docs.get(`breedingRecords/${breeding.id}`)
          if (!current) throw new Error('Empadre no encontrado.')
          changes.push({
            path: `breedingRecords/${breeding.id}`,
            data: {
              femaleBreedingInfo: current.femaleBreedingInfo.map((info: any) =>
                info.femaleId === form.animalId
                  ? {
                      ...info,
                      actualBirthDate: date,
                      outcome: 'calved',
                      offspring: [
                        ...(info.offspring ?? []),
                        ...childPaths.map((p) => p.split('/')[1]),
                      ],
                    }
                  : info,
              ),
            },
          })
        }
        return {
          changes,
          record: {
            type: 'birth',
            category: 'general',
            eventType: 'parto',
            title: `Parto: ${form.offspring.length} crías`,
            date,
            notes: form.notes ?? '',
            description: form.notes ?? '',
            details: {
              Madre: mother.animalNumber,
              Crías: form.offspring
                .map(
                  (c) =>
                    `#${c.animalNumber} (${c.gender}, ${c.status}${c.weight ? `, ${c.weight} kg` : ''})`,
                )
                .join(', '),
            },
          },
        } as MovementPlan
      })
    },
  }
}
