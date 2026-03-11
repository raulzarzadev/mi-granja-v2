'use client'

import { useParams, useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ReminderForm from '@/components/ReminderForm'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'

export default function EditarRecordatorioPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { animals } = useAnimalCRUD()
  const { reminders, updateReminder } = useReminders()

  const reminder = reminders.find((r) => r.id === params.id)

  const handleSubmit = async (data: any) => {
    if (!reminder) return
    await updateReminder(reminder.id, data)
    router.back()
  }

  if (!reminder) {
    return (
      <PageShell title="Editar Recordatorio">
        <div className="text-center py-8 text-gray-500">
          <p>No se encontro el recordatorio.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-green-600 hover:text-green-800 font-medium"
          >
            Volver
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Editar Recordatorio">
      <ReminderForm
        animals={animals}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onSuccess={() => router.back()}
        initialData={reminder}
      />
    </PageShell>
  )
}
