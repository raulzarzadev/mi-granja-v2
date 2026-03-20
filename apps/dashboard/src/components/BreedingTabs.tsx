'use client'

import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import BirthsWindowSummary from '@/components/BirthsWindowSummary'
import BreedingCard from '@/components/BreedingCard'
import BreedingTable from '@/components/BreedingTable'
import GeneticTree from '@/components/GeneticTree'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import Tabs from '@/components/Tabs'
import { addDays, differenceInCalendarDays } from 'date-fns'
import AnimalBadges from '@/components/AnimalBadges'
import AnimalListView from '@/components/Dashboard/Animals/AnimalListView'
import ModalAnimalDetails from '@/components/ModalAnimalDetails'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { getWeaningDays } from '@/lib/animalBreedingConfig'
import { toDate } from '@/lib/dates'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'

const BreedingTabs: React.FC = () => {
  const router = useRouter()
  const {
    breedingRecords,
    updateBreedingRecord,
    deleteBreedingRecord,
    getBirthsWindow,
    getBirthsWindowSummary,
  } = useBreedingCRUD()

  const { animals, wean, create, addRecord } = useAnimalCRUD()
  const editRecord = (record: BreedingRecord) => router.push(`/monta/${record.id}/editar`)
  const [birthRecord, setBirthRecord] = React.useState<BreedingRecord | null>(null)
  const [birthFemaleId, setBirthFemaleId] = React.useState<string | null>(null)
  const [confirmPregnancyRecord, setConfirmPregnancyRecord] = React.useState<BreedingRecord | null>(
    null,
  )

  const [selectedAnimal, setSelectedAnimal] = useState<null | string>(null)
  const [montasViewMode, setMontasViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')

  // Filter breeding records by search text (animal numbers, male)
  const filteredBreedingRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return breedingRecords
    return breedingRecords.filter((r) => {
      const male = animals.find((a) => a.id === r.maleId)
      const maleNum = male?.animalNumber?.toLowerCase() || ''
      const maleName = male?.name?.toLowerCase() || ''
      const femaleNums = r.femaleBreedingInfo
        .map((f) => {
          const a = animals.find((an) => an.id === f.femaleId)
          return `${a?.animalNumber || ''} ${a?.name || ''}`
        })
        .join(' ')
        .toLowerCase()
      const dateStr = r.breedingDate ? new Date(r.breedingDate).toLocaleDateString() : ''
      return (
        maleNum.includes(q) || maleName.includes(q) || femaleNums.includes(q) || dateStr.includes(q)
      )
    })
  }, [breedingRecords, animals, search])

  const handleOpenAddBirth: BreedingActionHandlers['onAddBirth'] = (record, femaleId) => {
    setBirthRecord(record)
    setBirthFemaleId(femaleId)
  }
  const handleOpenConfirmPregnancy: BreedingActionHandlers['onConfirmPregnancy'] = (
    props,
    femaleId,
  ) => {
    setConfirmPregnancyRecord(props)
    setSelectedAnimal(femaleId)
  }

  // Lista plana de hembras embarazadas
  const pregnantFemales = useMemo(
    () =>
      filteredBreedingRecords.flatMap((record) =>
        record.femaleBreedingInfo
          .filter((f) => f.pregnancyConfirmedDate && !f.actualBirthDate)
          .map((info) => ({
            record,
            info,
            animal: animals.find((a) => a.id === info.femaleId),
          })),
      ),
    [filteredBreedingRecords, animals],
  )
  const birthsWindow = getBirthsWindow(14)
  const birthsSummary = getBirthsWindowSummary(14)

  // Crías sin destetar (para tab Destetes), ordenadas por fecha de destete
  const unweanedOffspring = useMemo(() => {
    const result: { animal: typeof animals[number]; motherId: string; record: BreedingRecord; weanDate: Date | null; daysUntilWean: number | null }[] = []
    for (const record of filteredBreedingRecords) {
      for (const fi of record.femaleBreedingInfo) {
        if (!fi.offspring || fi.offspring.length === 0) continue
        for (const offId of fi.offspring) {
          const a = animals.find((an) => an.id === offId)
          if (a && a.stage === 'cria' && a.status !== 'muerto' && a.status !== 'vendido') {
            let weanDate: Date | null = null
            let daysUntilWean: number | null = null
            if (a.birthDate) {
              const days = getWeaningDays(a)
              weanDate = addDays(toDate(a.birthDate), days)
              daysUntilWean = differenceInCalendarDays(weanDate, new Date())
            }
            result.push({ animal: a, motherId: fi.femaleId, record, weanDate, daysUntilWean })
          }
        }
      }
    }
    // Ordenar: más urgentes primero (daysUntilWean ascendente, nulls al final)
    return result.sort((a, b) => {
      if (a.daysUntilWean === null && b.daysUntilWean === null) return 0
      if (a.daysUntilWean === null) return 1
      if (b.daysUntilWean === null) return -1
      return a.daysUntilWean - b.daysUntilWean
    })
  }, [filteredBreedingRecords, animals])

  // Ordenar montas
  const orderedBreedings = useMemo(() => {
    const needPregnancyConfirmation: BreedingRecord[] = []
    const needBirthConfirmation: BreedingRecord[] = []
    const finished: BreedingRecord[] = []

    filteredBreedingRecords.forEach((r) => {
      let hasPendingPregnancyConfirm = false
      let hasPendingBirth = false
      r.femaleBreedingInfo.forEach((f) => {
        if (!f.actualBirthDate) {
          if (f.pregnancyConfirmedDate) hasPendingBirth = true
          else hasPendingPregnancyConfirm = true
        }
      })
      if (hasPendingPregnancyConfirm) needPregnancyConfirmation.push(r)
      else if (hasPendingBirth) needBirthConfirmation.push(r)
      else finished.push(r)
    })

    const sortDesc = (a: BreedingRecord, b: BreedingRecord) =>
      (b.breedingDate?.getTime() || 0) - (a.breedingDate?.getTime() || 0)

    return {
      needPregnancyConfirmation: needPregnancyConfirmation.sort(sortDesc),
      needBirthConfirmation: needBirthConfirmation.sort(sortDesc),
      finished: finished.sort(sortDesc),
    }
  }, [filteredBreedingRecords])

  const handleRemoveFromBreeding = async (record: BreedingRecord, animalId: string) => {
    if (record.maleId === animalId) {
      await deleteBreedingRecord(record.id)
    } else {
      const updatedFemaleInfo = record.femaleBreedingInfo.filter((i) => i.femaleId !== animalId)
      if (updatedFemaleInfo.length === 0) {
        await deleteBreedingRecord(record.id)
      } else {
        await updateBreedingRecord(record.id, {
          femaleBreedingInfo: updatedFemaleInfo,
        })
      }
    }
  }

  const handleUnconfirmPregnancy = async (record: BreedingRecord, femaleId: string) => {
    const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
      info.femaleId === femaleId
        ? { ...info, pregnancyConfirmedDate: null, expectedBirthDate: null }
        : info,
    )
    await updateBreedingRecord(record.id, {
      femaleBreedingInfo: updatedFemaleInfo,
    })
  }

  // Producción: animales por etapa (filtrados por search)
  const prodAnimals = useMemo(() => {
    const q = search.trim().toLowerCase()
    const alive = animals.filter((a) => {
      if (a.status === 'muerto' || a.status === 'vendido') return false
      if (!q) return true
      const num = a.animalNumber?.toLowerCase() || ''
      const name = a.name?.toLowerCase() || ''
      return num.includes(q) || name.includes(q)
    })
    return {
      engorda: alive.filter((a) => a.stage === 'engorda'),
      juvenil: alive.filter((a) => a.stage === 'juvenil'),
      reproductor: alive.filter((a) => a.stage === 'reproductor'),
    }
  }, [animals, search])

  const tabs = [
    {
      label: '📑 Montas',
      badgeCount:
        orderedBreedings.needPregnancyConfirmation.length +
        orderedBreedings.needBirthConfirmation.length,
      content: (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <h3 className="text-lg font-semibold">Montas Pendientes</h3>
              <div className="flex items-center gap-2">
                {/* Toggle cards/tabla */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setMontasViewMode('cards')}
                    className={`p-1.5 transition-colors ${
                      montasViewMode === 'cards'
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
                    onClick={() => setMontasViewMode('table')}
                    className={`p-1.5 transition-colors ${
                      montasViewMode === 'table'
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

            {montasViewMode === 'table' ? (
              <BreedingTable
                records={[
                  ...orderedBreedings.needPregnancyConfirmation,
                  ...orderedBreedings.needBirthConfirmation,
                  ...orderedBreedings.finished,
                ]}
                animals={animals}
                onSelect={editRecord}
                onDelete={(ids) => {
                  for (const id of ids) {
                    deleteBreedingRecord(id)
                  }
                }}
              />
            ) : (
              <>
                {orderedBreedings.needPregnancyConfirmation.length === 0 &&
                orderedBreedings.needBirthConfirmation.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay montas pendientes.</p>
                ) : (
                  <div className="space-y-8">
                    {orderedBreedings.needPregnancyConfirmation.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span>Por confirmar gestacion</span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            {orderedBreedings.needPregnancyConfirmation.length}
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {orderedBreedings.needPregnancyConfirmation.map((r) => (
                            <BreedingCard
                              key={r.id}
                              record={r}
                              animals={animals}
                              onEdit={editRecord}
                              onAddBirth={handleOpenAddBirth}
                              onConfirmPregnancy={(record, femaleId) => {
                                handleOpenConfirmPregnancy(record, femaleId)
                              }}
                              onUnconfirmPregnancy={handleUnconfirmPregnancy}
                              onDelete={(rec) => deleteBreedingRecord(rec.id)}
                              onRemoveFromBreeding={handleRemoveFromBreeding}
                              onDeleteBirth={() => null}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {orderedBreedings.needBirthConfirmation.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <span>Partos próximos</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {orderedBreedings.needBirthConfirmation.length}
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {orderedBreedings.needBirthConfirmation.map((r) => (
                            <BreedingCard
                              key={r.id}
                              record={r}
                              animals={animals}
                              onEdit={editRecord}
                              onAddBirth={handleOpenAddBirth}
                              onConfirmPregnancy={setConfirmPregnancyRecord}
                              onUnconfirmPregnancy={handleUnconfirmPregnancy}
                              onDelete={(rec) => deleteBreedingRecord(rec.id)}
                              onRemoveFromBreeding={handleRemoveFromBreeding}
                              onDeleteBirth={() => null}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-3">Montas Finalizadas</h3>
                  {orderedBreedings.finished.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay montas finalizadas.</p>
                  ) : (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 flex items-center gap-2">
                        Ver mas ({orderedBreedings.finished.length})
                      </summary>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {orderedBreedings.finished.map((r) => (
                          <BreedingCard
                            key={r.id}
                            record={r}
                            animals={animals}
                            onEdit={editRecord}
                            onAddBirth={handleOpenAddBirth}
                            onConfirmPregnancy={setConfirmPregnancyRecord}
                            onUnconfirmPregnancy={handleUnconfirmPregnancy}
                            onDelete={(rec) => deleteBreedingRecord(rec.id)}
                            onRemoveFromBreeding={handleRemoveFromBreeding}
                            onDeleteBirth={() => null}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      label: '🤰 Partos próximos',
      badgeCount: pregnantFemales.length + birthsSummary.pastDueCount,
      content: (
        <div className="space-y-6">
          {/* Próximos / Atrasados (ventana de 14 días) */}
          {(birthsWindow.pastDue.length > 0 || birthsWindow.upcoming.length > 0) && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Proximos / Atrasados</h3>
              <BirthsWindowSummary
                pastDue={birthsWindow.pastDue}
                upcoming={birthsWindow.upcoming}
                days={birthsSummary.windowDays}
                animals={animals}
                onSelectRecord={(r, femaleId) => {
                  setBirthRecord(r)
                  setBirthFemaleId(femaleId)
                }}
              />
            </div>
          )}

          {/* Todas las hembras embarazadas */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Partos próximos</h3>
            {pregnantFemales.length === 0 ? (
              <p className="text-sm text-gray-500">No hay partos pendientes.</p>
            ) : (
              <ul className="divide-y">
                {pregnantFemales.map(({ record, info, animal }) => {
                  const expected = info.expectedBirthDate ? toDate(info.expectedBirthDate) : null
                  const daysLeft = expected
                    ? Math.round((expected.getTime() - Date.now()) / 86400000)
                    : null
                  return (
                    <li
                      key={record.id + info.femaleId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">
                            {animal?.type === 'oveja'
                              ? '🐑'
                              : animal?.type === 'cabra'
                                ? '🐐'
                                : animal?.type?.includes('vaca')
                                  ? '🐄'
                                  : '🐾'}
                          </span>
                          <span className="font-medium">
                            {animal?.animalNumber || info.femaleId}
                          </span>
                          {expected && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                daysLeft !== null && daysLeft < 0
                                  ? 'bg-red-100 text-red-700'
                                  : daysLeft !== null && daysLeft <= 7
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {expected.toLocaleDateString()} (
                              {daysLeft !== null
                                ? daysLeft === 0
                                  ? 'Hoy'
                                  : daysLeft > 0
                                    ? `En ${daysLeft}d`
                                    : `Atrasado ${Math.abs(daysLeft)}d`
                                : '—'}
                              )
                            </span>
                          )}
                          {info.pregnancyConfirmedDate && (
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                              Confirmado
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          Monta: {record.id}{' '}
                          {record.breedingDate && (
                            <>· {toDate(record.breedingDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded"
                          onClick={() => editRecord(record)}
                        >
                          Ver monta
                        </button>
                        <button
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1 rounded"
                          onClick={() => {
                            setBirthRecord(record)
                            setBirthFemaleId(info.femaleId)
                          }}
                        >
                          Registrar parto
                        </button>
                        <button
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded"
                          onClick={() => handleUnconfirmPregnancy(record, info.femaleId)}
                        >
                          Desconfirmar
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ),
    },
    {
      label: '🍼 Destetes',
      badgeCount: unweanedOffspring.length,
      content: (
        <div className="bg-white rounded-lg shadow p-4">
          {unweanedOffspring.length === 0 ? (
            <p className="text-sm text-gray-500">No hay crías pendientes de destete.</p>
          ) : (
            <ul className="divide-y">
              {unweanedOffspring.map(({ animal: a, motherId, daysUntilWean, weanDate }) => {
                const mother = animals.find((an) => an.id === motherId)
                const isOverdue = daysUntilWean !== null && daysUntilWean < 0
                const isSoon = daysUntilWean !== null && daysUntilWean >= 0 && daysUntilWean <= 7
                return (
                  <li key={a.id} className="py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Click para ver detalles */}
                    <ModalAnimalDetails
                      animal={a}
                      triggerComponent={
                        <div className="cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors">
                          <AnimalBadges animal={a} />
                        </div>
                      }
                    />

                    {/* Fecha de destete */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isSoon
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {daysUntilWean !== null
                        ? daysUntilWean === 0
                          ? 'Hoy'
                          : daysUntilWean > 0
                            ? `En ${daysUntilWean}d`
                            : `Hace ${Math.abs(daysUntilWean)}d`
                        : 'Sin fecha'}
                    </span>

                    {/* Madre */}
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      M: {mother?.animalNumber || '—'}
                    </span>

                    {/* Botones de destete */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <button
                        className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors font-medium"
                        onClick={() => wean(a.id, { stageDecision: 'engorda' })}
                      >
                        Destetar a Engorda
                      </button>
                      <button
                        className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors font-medium"
                        onClick={() => wean(a.id, { stageDecision: 'reproductor' })}
                      >
                        Destetar a Reproductor
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ),
    },
    {
      label: '🏭 Produccion',
      badgeCount: prodAnimals.engorda.length + prodAnimals.juvenil.length + prodAnimals.reproductor.length,
      content: (
        <Tabs
          tabsId="produccion-tabs"
          tabs={[
            {
              label: '🍖 Engorda',
              badgeCount: prodAnimals.engorda.length,
              content: (
                <AnimalListView
                  animals={prodAnimals.engorda}
                  emptyMessage="No hay animales en engorda"
                />
              ),
            },
            {
              label: '🌱 Juveniles',
              badgeCount: prodAnimals.juvenil.length,
              content: (
                <AnimalListView
                  animals={prodAnimals.juvenil}
                  emptyMessage="No hay animales juveniles"
                />
              ),
            },
            {
              label: '🐏 Reproductores',
              badgeCount: prodAnimals.reproductor.length,
              content: (
                <AnimalListView
                  animals={prodAnimals.reproductor}
                  emptyMessage="No hay animales reproductores"
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      label: '🧬 Genetica',
      content: <GeneticTree animals={animals} />,
    },
  ]

  return (
    <>
      {/* Search + add header */}
      <div className="bg-white rounded-lg shadow mb-3">
        <div className="px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por animal, macho, hembra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-2 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              title="Limpiar búsqueda"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-red-500"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => router.push('/monta/nueva')}
            className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            title="Nueva Monta"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        </div>
        {search && (
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{filteredBreedingRecords.length}</span>{' '}
              de {breedingRecords.length} montas
            </span>
          </div>
        )}
      </div>
      <Tabs tabs={tabs} tabsId="breeding-tabs" />
      <ModalBirthForm
        isOpen={!!birthRecord}
        onClose={() => {
          setBirthRecord(null)
          setBirthFemaleId(null)
        }}
        breedingRecord={birthRecord as BreedingRecord}
        animals={animals}
        selectedFemaleId={birthFemaleId || undefined}
        onSubmit={async (form) => {
          try {
            if (!birthRecord) return
            const mother = animals.find((a) => a.id === form.animalId)
            if (!mother) throw new Error('Madre no encontrada')

            const [y, m, d] = form.birthDate.split('-').map((n) => parseInt(n, 10))
            const [hh, mm] = form.birthTime.split(':').map((n) => parseInt(n, 10))
            const actualDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)

            const offspringIds: string[] = []
            for (const off of form.offspring) {
              const weightVal =
                typeof off.weight === 'string'
                  ? off.weight === ''
                    ? null
                    : parseFloat(off.weight)
                  : (off.weight ?? null)
              const notesParts = [
                off.color ? `Color: ${off.color}` : null,
                off.healthIssues ? `Salud: ${off.healthIssues}` : null,
              ].filter(Boolean)

              const isDead = off.status === 'muerto'

              const createdId = await create({
                animalNumber: off.animalNumber,
                type: mother.type,
                stage: 'cria',
                weight: weightVal,
                birthDate: actualDate,
                gender: off.gender,
                motherId: mother.id,
                fatherId: birthRecord.maleId,
                ...(notesParts.length > 0 && { notes: notesParts.join(' · ') }),
                ...(isDead && { status: 'muerto' as const, statusAt: actualDate }),
              })
              if (createdId) offspringIds.push(createdId)
            }

            const updatedFemaleInfo = birthRecord.femaleBreedingInfo.map((fi) =>
              fi.femaleId === form.animalId
                ? {
                    ...fi,
                    actualBirthDate: actualDate,
                    offspring: [...(fi.offspring || []), ...offspringIds],
                  }
                : fi,
            )
            await updateBreedingRecord(birthRecord.id, {
              femaleBreedingInfo: updatedFemaleInfo,
            })

            // Crear registro tipo 'birth' en la madre
            const offspringSummary = form.offspring
              .map((o) => `#${o.animalNumber} (${o.gender}${o.weight ? `, ${o.weight}kg` : ''})`)
              .join(', ')
            await addRecord(form.animalId, {
              type: 'birth',
              category: 'general',
              title: `Parto: ${form.totalOffspring} cría${form.totalOffspring > 1 ? 's' : ''}`,
              description: offspringSummary,
              date: actualDate,
              notes: form.notes || undefined,
            })
          } catch (e) {
            console.error(e)
          }
        }}
        isLoading={false}
      />
      <ModalConfirmPregnancy
        isOpen={!!confirmPregnancyRecord}
        onClose={() => setConfirmPregnancyRecord(null)}
        breedingRecord={confirmPregnancyRecord as BreedingRecord}
        animals={animals}
        onSubmit={(r) => updateBreedingRecord(r.id, r)}
        isLoading={false}
        selectedAnimal={selectedAnimal}
      />
    </>
  )
}

export default BreedingTabs
