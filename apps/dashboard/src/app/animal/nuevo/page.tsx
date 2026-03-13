'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import AnimalForm from '@/components/AnimalForm'
import BulkAnimalForm from '@/components/BulkAnimalForm'
import PageShell from '@/components/PageShell'
import { RootState } from '@/features/store'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { Animal, AnimalRecord } from '@/types/animals'

type RegistrationMode = 'individual' | 'masivo'

function makeCreationRecord(
  userId: string,
  animalNumber: string,
  mode: 'individual' | 'masivo',
  batch?: string,
): AnimalRecord {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    type: 'note',
    category: 'general',
    title: mode === 'masivo' ? 'Registro masivo' : 'Animal registrado',
    description:
      mode === 'masivo'
        ? `Animal ${animalNumber} registrado en lote masivo${batch ? ` (${batch})` : ''}`
        : `Animal ${animalNumber} registrado en el sistema`,
    date: now,
    createdAt: now,
    createdBy: userId,
  }
}

export default function NuevoAnimalPage() {
  const router = useRouter()
  const { create: createAnimal, isLoading, animals } = useAnimalCRUD()
  const { user } = useSelector((state: RootState) => state.auth)
  const [mode, setMode] = useState<RegistrationMode>('individual')

  const handleSubmit = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      const record = makeCreationRecord(user!.id, animalData.animalNumber, 'individual')
      await createAnimal({ ...animalData, records: [record] })
      router.back()
    } catch (error) {
      console.error('Error creating animal:', error)
    }
  }

  const handleCreateOne = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    const record = makeCreationRecord(user!.id, animalData.animalNumber, 'masivo', animalData.batch)
    await createAnimal({ ...animalData, records: [record] })
  }

  return (
    <PageShell title="Registrar Nuevo Animal">
      {/* Toggle Individual / Masivo */}
      <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode('individual')}
          className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'individual'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => setMode('masivo')}
          className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'masivo'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Masivo
        </button>
      </div>

      {mode === 'individual' ? (
        <AnimalForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={isLoading}
          existingAnimals={animals}
        />
      ) : (
        <BulkAnimalForm
          onCreateOne={handleCreateOne}
          onDone={() => router.back()}
          onCancel={() => router.back()}
          isLoading={isLoading}
          existingAnimals={animals}
        />
      )}
    </PageShell>
  )
}
