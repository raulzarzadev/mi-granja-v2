import React, { useMemo, useState } from 'react'
import BirthsWindowSummary from '@/components/BirthsWindowSummary'
import BreedingCard from '@/components/BreedingCard'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalBreedingForm from '@/components/ModalBreedingForm'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import ModalEditBreeding from '@/components/ModalEditBreeding'
import Tabs from '@/components/Tabs'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { BreedingRecord } from '@/types/breedings'
import { BreedingActionHandlers } from '@/types/components/breeding'

// Nuevo componente que segmenta la reproducción en 3 tabs: Embarazos, Partos, Montas
const BreedingTabs: React.FC = () => {
  const {
    breedingRecords,
    updateBreedingRecord,
    deleteBreedingRecord,
    getBirthsWindow,
    getBirthsWindowSummary,
  } = useBreedingCRUD()

  const { animals, wean, create } = useAnimalCRUD()
  const [editingRecord, setEditingRecord] = React.useState<BreedingRecord | null>(null)
  const [birthRecord, setBirthRecord] = React.useState<BreedingRecord | null>(null)
  const [birthFemaleId, setBirthFemaleId] = React.useState<string | null>(null)
  const [confirmPregnancyRecord, setConfirmPregnancyRecord] = React.useState<BreedingRecord | null>(
    null,
  )

  const [selectedAnimal, setSelectedAnimal] = useState<null | string>(null)

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

  // Lista plana de hembras embarazadas (cada hembra como item)
  const pregnantFemales = useMemo(
    () =>
      breedingRecords.flatMap((record) =>
        record.femaleBreedingInfo
          .filter((f) => f.pregnancyConfirmedDate && !f.actualBirthDate)
          .map((info) => ({
            record,
            info,
            animal: animals.find((a) => a.id === info.femaleId),
          })),
      ),
    [breedingRecords, animals],
  )
  const birthsWindow = getBirthsWindow(14)
  const birthsSummary = getBirthsWindowSummary(14)

  // Partos recientes: registros con actualBirthDate recientes
  const recentBirths = useMemo(() => {
    const daysCutoff = 120 // ~4 meses
    const now = Date.now()
    const msDay = 86400000
    return breedingRecords.flatMap((record) =>
      record.femaleBreedingInfo
        .filter((f) => f.actualBirthDate && f.offspring && f.offspring.length > 0)
        .map((f) => ({ record, info: f }))
        .filter(({ info }) => {
          const d = (info.actualBirthDate as Date).getTime()
          return now - d <= daysCutoff * msDay
        }),
    )
  }, [breedingRecords])

  // Ordenar montas: activas primero
  const orderedBreedings = useMemo(() => {
    const needPregnancyConfirmation: BreedingRecord[] = [] // hay hembras sin pregnancyConfirmedDate ni actualBirthDate
    const needBirthConfirmation: BreedingRecord[] = [] // hay hembras con pregnancyConfirmedDate pero sin actualBirthDate
    const finished: BreedingRecord[] = [] // todas las hembras tienen actualBirthDate o se marcarán luego si añadimos estado fallido

    breedingRecords.forEach((r) => {
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
  }, [breedingRecords])

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

  const tabs = [
    {
      label: '🤰 Embarazos',
      badgeCount: pregnantFemales.length,
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Embarazos Confirmados</h3>
            {pregnantFemales.length === 0 ? (
              <p className="text-sm text-gray-500">No hay embarazos confirmados.</p>
            ) : (
              <ul className="divide-y">
                {pregnantFemales.map(({ record, info, animal }) => {
                  const expected = info.expectedBirthDate ? new Date(info.expectedBirthDate) : null
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
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                              {expected.toLocaleDateString()} (
                              {daysLeft !== null
                                ? daysLeft === 0
                                  ? 'Hoy'
                                  : daysLeft > 0
                                    ? `En ${daysLeft}d`
                                    : `Hace ${Math.abs(daysLeft)}d`
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
                            <>· {new Date(record.breedingDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded"
                          onClick={() => setEditingRecord(record)}
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
      label: '🐣 Partos',
      badgeCount: birthsSummary.upcomingCount + birthsSummary.pastDueCount,
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Resumen Próximos / Atrasados</h3>
            <BirthsWindowSummary
              pastDue={birthsWindow.pastDue}
              upcoming={birthsWindow.upcoming}
              days={birthsSummary.windowDays}
              onSelectRecord={(r) => setEditingRecord(r)}
            />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Últimos Nacimientos</h3>
            {recentBirths.length === 0 ? (
              <p className="text-sm text-gray-500">Sin nacimientos recientes.</p>
            ) : (
              <ul className="divide-y text-sm">
                {recentBirths.map(({ record, info }, idx) => {
                  const date = info.actualBirthDate as Date
                  const ageDays = Math.floor((Date.now() - date.getTime()) / 86400000)
                  const ageLabel =
                    ageDays < 7
                      ? `${ageDays} días`
                      : ageDays < 30
                        ? `${Math.floor(ageDays / 7)} sem`
                        : `${Math.floor(ageDays / 30)} mes(es)`
                  const offspringList = info.offspring || []
                  return (
                    <li key={record.id + idx} className="py-2 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Hembra {info.femaleId}</span>{' '}
                          <span className="text-gray-500">
                            · {date.toLocaleDateString()} · {ageLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={() => setEditingRecord(record)}
                          >
                            Ver monta
                          </button>
                        </div>
                      </div>
                      {offspringList.length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-2">
                          {offspringList.map((offspringId) => {
                            const a = animals.find((an) => an.id === offspringId)
                            if (!a) return null
                            const isWeaned = a.isWeaned
                            return (
                              <div
                                key={offspringId}
                                className={`flex items-center gap-2 border rounded px-2 py-1 text-xs ${
                                  isWeaned
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-yellow-50 border-yellow-200'
                                }`}
                              >
                                <span className="font-medium">{a.animalNumber}</span>
                                <span className="text-[10px] text-gray-500">
                                  {a.gender === 'macho' ? 'M' : 'H'}
                                </span>
                                {!isWeaned && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      className="text-[10px] bg-white border border-green-300 text-green-700 px-2 py-0.5 rounded hover:bg-green-100"
                                      onClick={() =>
                                        wean(offspringId, {
                                          stageDecision: 'engorda',
                                        })
                                      }
                                    >
                                      Destetar→Engorda
                                    </button>
                                    <button
                                      className="text-[10px] bg-white border border-blue-300 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100"
                                      onClick={() =>
                                        wean(offspringId, {
                                          stageDecision: 'reproductor',
                                        })
                                      }
                                    >
                                      Destetar→Repro
                                    </button>
                                  </div>
                                )}
                                {isWeaned && (
                                  <span className="text-[10px] text-green-700 flex items-center gap-1">
                                    ✅ Destetado
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
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
      label: '📑 Montas',
      badgeCount:
        orderedBreedings.needPregnancyConfirmation.length +
        orderedBreedings.needBirthConfirmation.length,
      content: (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <h3 className="text-lg font-semibold">Montas Pendientes</h3>
              <ModalBreedingForm />
            </div>
            {orderedBreedings.needPregnancyConfirmation.length === 0 &&
            orderedBreedings.needBirthConfirmation.length === 0 ? (
              <p className="text-sm text-gray-500">No hay montas pendientes.</p>
            ) : (
              <div className="space-y-8">
                {orderedBreedings.needPregnancyConfirmation.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span>Por confirmar embarazos</span>
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
                          onEdit={setEditingRecord}
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
                      <span>Embarazos confirmados (esperando parto)</span>
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
                          onEdit={setEditingRecord}
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
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Montas Finalizadas</h3>
            {orderedBreedings.finished.length === 0 ? (
              <p className="text-sm text-gray-500">No hay montas finalizadas.</p>
            ) : (
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 flex items-center gap-2">
                  Ver más ({orderedBreedings.finished.length})
                </summary>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orderedBreedings.finished.map((r) => (
                    <BreedingCard
                      key={r.id}
                      record={r}
                      animals={animals}
                      onEdit={setEditingRecord}
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
        </div>
      ),
    },
  ]

  return (
    <>
      <Tabs tabs={tabs} tabsId="breeding-tabs" />
      <ModalEditBreeding
        animals={animals}
        record={editingRecord}
        onSubmit={(id, data) => updateBreedingRecord(id, data)}
        onClose={() => setEditingRecord(null)}
        isLoading={false}
      />
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
          // Crear crías y actualizar registro de monta
          try {
            if (!birthRecord) return
            const mother = animals.find((a) => a.id === form.animalId)
            if (!mother) throw new Error('Madre no encontrada')

            // Fecha/hora
            const [y, m, d] = form.birthDate.split('-').map((n) => parseInt(n, 10))
            const [hh, mm] = form.birthTime.split(':').map((n) => parseInt(n, 10))
            const actualDate = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)

            // Crear crías
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
                off.status ? `Estado: ${off.status}` : null,
                off.healthIssues ? `Salud: ${off.healthIssues}` : null,
              ].filter(Boolean)

              const createdId = await create({
                animalNumber: off.animalNumber,
                type: mother.type,
                stage: 'cria',
                weight: weightVal,
                birthDate: actualDate,
                gender: off.gender,
                motherId: mother.id,
                fatherId: birthRecord.maleId,
                notes: notesParts.length ? notesParts.join(' · ') : undefined,
              })
              if (createdId) offspringIds.push(createdId)
            }

            // Actualizar femaleBreedingInfo del registro
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

            // Cerrar modal
            setBirthRecord(null)
            setBirthFemaleId(null)
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
