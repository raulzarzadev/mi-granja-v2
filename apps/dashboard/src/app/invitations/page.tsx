import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Invitaciones',
}

export default function InvitationsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Invitaciones</h1>
      <p className="text-sm text-gray-600 mb-4">
        Gestiona tus invitaciones pendientes o aceptadas.
      </p>
      <ul className="list-disc pl-5 text-sm">
        <li>
          <Link className="text-blue-600 underline" href="/invitations/confirm">
            Ir a confirmar invitación
          </Link>
        </li>
      </ul>
    </main>
  )
}
