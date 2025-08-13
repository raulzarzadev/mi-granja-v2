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
      badgeCount: pregnancies.length,
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">
              Embarazos Confirmados
            </h3>
            {pregnancies.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay embarazos confirmados.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pregnancies.map((r) => (
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
