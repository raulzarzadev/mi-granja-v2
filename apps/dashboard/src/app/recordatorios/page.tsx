'use client'

import PageShell from '@/components/PageShell'
import RemindersTab from '@/components/RemindersTab'

/** Vista con todas las notificaciones y recordatorios de la granja. */
export default function RecordatoriosPage() {
  return (
    <PageShell title="Notificaciones y recordatorios" bare>
      <RemindersTab />
    </PageShell>
  )
}
