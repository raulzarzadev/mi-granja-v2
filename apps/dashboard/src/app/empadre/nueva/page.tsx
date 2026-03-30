'use client'

import { useRouter } from 'next/navigation'
import BreedingForm from '@/components/BreedingForm'
import PageShell from '@/components/PageShell'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { BreedingRecord } from '@/types/breedings'

export default function NuevoEmpadrePage() {
  const router = useRouter()
  const { animals } = useAnimalCRUD()
  const { createBreedingRecord, isSubmitting } = useBreedingCRUD()

  const handleSubmit = async (
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>,
  ) => {
    await createBreedingRecord(data)
    router.back()
  }

  return (
    <PageShell title="Registrar Empadre">
      <BreedingForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isSubmitting}
      />
    </PageShell>
  )
}
