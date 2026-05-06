'use client'

import { useParams, useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ReminderCard from '@/components/ReminderCard'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useReminders } from '@/hooks/useReminders'

export default function RecordatorioDetallePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { animals } = useAnimalCRUD()
  const { reminders, markAsCompleted, markAnimalCompleted, deleteReminder } = useReminders()

  const reminder = reminders.find((r) => r.id === params.id)

  if (!reminder) {
    return (
      <PageShell title="Recordatorio">
        <div className="text-center py-8 text-gray-500">
          <p>No se encontró el recordatorio.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-green-600 hover:text-green-800 font-medium cursor-pointer"
          >
            Volver
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="Recordatorio">
      <div className="max-w-2xl mx-auto">
        <ReminderCard
          reminder={reminder}
          animals={animals}
          onEdit={(r) => router.push(`/recordatorio/${r.id}/editar`)}
          onComplete={(r) => markAsCompleted(r.id)}
          onCompleteAnimal={(r, num, completed) => markAnimalCompleted(r.id, num, completed)}
          onDelete={async (r) => {
            await deleteReminder(r.id)
            router.back()
          }}
        />
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            ← Volver
          </button>
        </div>
      </div>
    </PageShell>
  )
}
