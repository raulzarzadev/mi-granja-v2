'use client'

import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ReminderForm from '@/components/ReminderForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'

export default function NuevoRecordatorioPage() {
  const router = useRouter()
  const { animals } = useAnimalCRUD()
  const { createReminder } = useReminders()

  const handleSubmit = async (data: any) => {
    await createReminder(data)
    router.back()
  }

  return (
    <PageShell title="Nuevo Recordatorio">
      <ReminderForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onSuccess={() => router.back()}
      />
    </PageShell>
  )
}
