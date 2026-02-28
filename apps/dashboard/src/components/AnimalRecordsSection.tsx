'use client'

import React, { useMemo, useState } from 'react'
import ModalCreateRecord from '@/components/ModalCreateRecord'
import ModalRecordDetail, { RecordDetailRow } from '@/components/ModalRecordDetail'
import RecordRow from '@/components/RecordRow'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { Animal, AnimalRecord } from '@/types/animals'

interface Props {
  animal: Animal
}

const AnimalRecordsSection: React.FC<Props> = ({ animal }) => {
  const { animals } = useAnimalCRUD()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<RecordDetailRow | null>(null)

  const sortedRecords: AnimalRecord[] = useMemo(() => {
    const records = [...(animal.records || [])]
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [animal.records])

  const openDetail = (rec: AnimalRecord) => {
    setDetailRecord({
      ...rec,
      animalId: animal.id,
      animalNumber: animal.animalNumber || 'Sin numero',
    })
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Registros</h3>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
        >
          + Nuevo registro
        </button>
      </div>

      {sortedRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>No hay registros aun</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedRecords.map((rec) => (
            <RecordRow key={rec.id} rec={rec} onClick={() => openDetail(rec)} />
          ))}
        </div>
      )}

      {/* Modal crear registro - animal pre-seleccionado */}
      <ModalCreateRecord
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        animals={animals}
        preSelectedAnimalIds={[animal.id]}
      />

      {/* Modal detalle de registro */}
      <ModalRecordDetail
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        record={detailRecord}
        animals={animals}
      />
    </div>
  )
}

export default AnimalRecordsSection
