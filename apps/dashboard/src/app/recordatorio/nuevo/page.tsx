'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import PageShell from '@/components/PageShell'
import ReminderForm from '@/components/ReminderForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'

function NuevoRecordatorioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { animals } = useAnimalCRUD()
  const { createReminder } = useReminders()

  const animalIds = (searchParams.get('animalIds')?.split(',').filter(Boolean) ?? []).filter((id) =>
    animals.some((animal) => animal.id === id),
  )

  const handleSubmit = async (data: any) => {
    await createReminder(data)
    router.back()
  }

  return (
    <PageShell title="Nuevo Recordatorio">
      <ReminderForm
        key={animalIds.join(',')}
        animals={animals}
        initialAnimalIds={animalIds}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onSuccess={() => router.back()}
      />
    </PageShell>
  )
}

export default function NuevoRecordatorioPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Cargando..." />}>
      <NuevoRecordatorioContent />
    </Suspense>
  )
}
