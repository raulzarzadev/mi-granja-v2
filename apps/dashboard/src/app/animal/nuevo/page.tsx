'use client'

import { useRouter } from 'next/navigation'
import AnimalForm from '@/components/AnimalForm'
import PageShell from '@/components/PageShell'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { Animal } from '@/types/animals'

export default function NuevoAnimalPage() {
  const router = useRouter()
  const { create: createAnimal, isLoading, animals } = useAnimalCRUD()

  const handleSubmit = async (
    animalData: Omit<Animal, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      await createAnimal(animalData)
      router.back()
    } catch (error) {
      console.error('Error creating animal:', error)
    }
  }

  return (
    <PageShell title="Registrar Nuevo Animal">
      <AnimalForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
        existingAnimals={animals}
      />
    </PageShell>
  )
}
