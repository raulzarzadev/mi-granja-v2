import React, { useMemo } from 'react'
import Tabs from '@/components/Tabs'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { BreedingRecord } from '@/types/breedings'
import ModalBirthForm from '@/components/ModalBirthForm'
import ModalEditBreeding from '@/components/ModalEditBreeding'
import ModalConfirmPregnancy from '@/components/ModalConfirmPregnancy'
import BreedingCard from '@/components/BreedingCard'
import BirthsWindowSummary from '@/components/BirthsWindowSummary'

// Nuevo componente que segmenta la reproducción en 3 tabs: Embarazos, Partos, Montas
const BreedingTabs: React.FC = () => {
  const {
    breedingRecords,
    updateBreedingRecord,
    deleteBreedingRecord,
    getActivePregnancies,
    getBirthsWindow,
    getBirthsWindowSummary
  } = useBreedingCRUD()
  const { animals } = useAnimalCRUD()
  const [editingRecord, setEditingRecord] =
    React.useState<BreedingRecord | null>(null)
  const [birthRecord, setBirthRecord] = React.useState<BreedingRecord | null>(
    null
  )
  const [confirmPregnancyRecord, setConfirmPregnancyRecord] =
    React.useState<BreedingRecord | null>(null)

  const pregnancies = getActivePregnancies()
  // Lista plana de hembras embarazadas (cada hembra como item)
  const pregnantFemales = useMemo(
    () =>
      breedingRecords.flatMap((record) =>
        record.femaleBreedingInfo
          .filter((f) => f.pregnancyConfirmedDate && !f.actualBirthDate)
          .map((info) => ({
            record,
            info,
            animal: animals.find((a) => a.id === info.femaleId)
          }))
      ),
    [breedingRecords, animals]
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
        .filter(
          (f) => f.actualBirthDate && f.offspring && f.offspring.length > 0
        )
        .map((f) => ({ record, info: f }))
        .filter(({ info }) => {
          const d = (info.actualBirthDate as Date).getTime()
          return now - d <= daysCutoff * msDay
        })
    )
  }, [breedingRecords])

  // Ordenar montas: activas primero
  const orderedBreedings = useMemo(() => {
    const active: BreedingRecord[] = []
    const finished: BreedingRecord[] = []
    breedingRecords.forEach((r) => {
      const hasPendingPregnancy = r.femaleBreedingInfo.some(
        (f) => f.pregnancyConfirmedDate && !f.actualBirthDate
      )
      if (hasPendingPregnancy) active.push(r)
      else finished.push(r)
    })
    const sortDesc = (a: BreedingRecord, b: BreedingRecord) =>
      (b.breedingDate?.getTime() || 0) - (a.breedingDate?.getTime() || 0)
    return {
      active: active.sort(sortDesc),
      finished: finished.sort(sortDesc)
    }
  }, [breedingRecords])

  const handleRemoveFromBreeding = async (
    record: BreedingRecord,
    animalId: string
  ) => {
    if (record.maleId === animalId) {
      await deleteBreedingRecord(record.id)
    } else {
      const updatedFemaleInfo = record.femaleBreedingInfo.filter(
        (i) => i.femaleId !== animalId
      )
      if (updatedFemaleInfo.length === 0) {
        await deleteBreedingRecord(record.id)
      } else {
        await updateBreedingRecord(record.id, {
          femaleBreedingInfo: updatedFemaleInfo
        })
      }
    }
  }

  const handleUnconfirmPregnancy = async (
    record: BreedingRecord,
    femaleId: string
  ) => {
    const updatedFemaleInfo = record.femaleBreedingInfo.map((info) =>
      info.femaleId === femaleId
        ? { ...info, pregnancyConfirmedDate: null, expectedBirthDate: null }
        : info
    )
    await updateBreedingRecord(record.id, {
      femaleBreedingInfo: updatedFemaleInfo
    })
  }

  const tabs = [
    {
      label: '🤰 Embarazos',
      badgeCount: pregnantFemales.length,
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">
              Embarazos Confirmados
            </h3>
            {pregnantFemales.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay embarazos confirmados.
              </p>
            ) : (
              <ul className="divide-y">
                {pregnantFemales.map(({ record, info, animal }) => {
                  const expected = info.expectedBirthDate
                    ? new Date(info.expectedBirthDate)
                    : null
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
                            <>
                              ·{' '}
                              {new Date(
                                record.breedingDate
                              ).toLocaleDateString()}
                            </>
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
                          onClick={() => setBirthRecord(record)}
                        >
                          Registrar parto
                        </button>
                        <button
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded"
                          onClick={() =>
                            handleUnconfirmPregnancy(record, info.femaleId)
                          }
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
      )
    },
    {
      label: '🐣 Partos',
      badgeCount: birthsSummary.upcomingCount + birthsSummary.pastDueCount,
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">
              Resumen Próximos / Atrasados
            </h3>
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
              <p className="text-sm text-gray-500">
                Sin nacimientos recientes.
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {recentBirths.map(({ record, info }, idx) => {
                  const date = info.actualBirthDate as Date
                  const ageDays = Math.floor(
                    (Date.now() - date.getTime()) / 86400000
                  )
                  const ageLabel =
                    ageDays < 7
                      ? `${ageDays} días`
                      : ageDays < 30
                      ? `${Math.floor(ageDays / 7)} sem`
                      : `${Math.floor(ageDays / 30)} mes(es)`
                  return (
                    <li
                      key={record.id + idx}
                      className="py-2 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium">
                          Hembra {info.femaleId}
                        </span>{' '}
                        <span className="text-gray-500">
                          · {date.toLocaleDateString()} · {ageLabel}
                        </span>
                      </div>
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => setEditingRecord(record)}
                      >
                        Ver monta
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )
    },
    {
      label: '📑 Montas',
      badgeCount: orderedBreedings.active.length,
      content: (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Montas con Embarazos Activos
            </h3>
            {orderedBreedings.active.length === 0 ? (
              <p className="text-sm text-gray-500">No hay montas activas.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderedBreedings.active.map((r) => (
                  <BreedingCard
                    key={r.id}
                    record={r}
                    animals={animals}
                    onEdit={setEditingRecord}
                    onAddBirth={setBirthRecord}
                    onConfirmPregnancy={setConfirmPregnancyRecord}
                    onUnconfirmPregnancy={handleUnconfirmPregnancy}
                    onDelete={(rec) => deleteBreedingRecord(rec.id)}
                    onRemoveFromBreeding={handleRemoveFromBreeding}
                    onDeleteBirth={() => null}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Montas Finalizadas</h3>
            {orderedBreedings.finished.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay montas finalizadas.
              </p>
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
                      onAddBirth={setBirthRecord}
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
      )
    }
  ]

  return (
    <>
      <Tabs tabs={tabs} />
      <ModalEditBreeding
        animals={animals}
        record={editingRecord}
        onSubmit={(id, data) => updateBreedingRecord(id, data)}
        onClose={() => setEditingRecord(null)}
        isLoading={false}
      />
      <ModalBirthForm
        isOpen={!!birthRecord}
        onClose={() => setBirthRecord(null)}
        breedingRecord={birthRecord as any}
        animals={animals}
        onSubmit={async () => {
          setBirthRecord(null)
        }}
        isLoading={false}
      />
      <ModalConfirmPregnancy
        isOpen={!!confirmPregnancyRecord}
        onClose={() => setConfirmPregnancyRecord(null)}
        breedingRecord={confirmPregnancyRecord as any}
        animals={animals}
        onSubmit={(r) => updateBreedingRecord(r.id, r)}
        isLoading={false}
      />
    </>
  )
}

export default BreedingTabs
