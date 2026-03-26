'use client'

import { useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  AdminFarmInfo,
  AdminInvitationInfo,
  AdminSaleInfo,
  useAdminStats,
} from '@/hooks/admin/useAdminStats'
import { animal_icon, animals_types_labels } from '@/types/animals'
import { sale_status_labels } from '@/types/sales'

type DrilldownPanel =
  | null
  | 'users'
  | 'farms'
  | 'animals'
  | 'species'
  | 'breedings'
  | 'reminders'
  | 'invitations'
  | 'sales'
  | { type: 'farm'; farm: AdminFarmInfo }

export default function AdminStatsCards() {
  const stats = useAdminStats()
  const [activePanel, setActivePanel] = useState<DrilldownPanel>(null)

  if (stats.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (stats.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error al cargar estadísticas: {stats.error}</p>
      </div>
    )
  }

  const toggle = (panel: DrilldownPanel) => {
    setActivePanel((prev) => {
      if (prev === panel) return null
      if (
        prev &&
        panel &&
        typeof prev === 'object' &&
        typeof panel === 'object' &&
        prev.type === panel.type &&
        prev.farm.id === panel.farm.id
      )
        return null
      return panel
    })
  }

  const isActive = (panel: string) => activePanel === panel

  const primaryStats = [
    {
      key: 'users',
      title: 'Usuarios',
      value: stats.totalUsers,
      icon: '👥',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      iconBg: 'bg-blue-500',
    },
    {
      key: 'farms',
      title: 'Granjas',
      value: stats.totalFarms,
      icon: '🚜',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-500',
    },
    {
      key: 'species',
      title: 'Especies',
      value: stats.speciesBreakdown.length,
      icon: '🐾',
      bg: 'bg-green-50',
      text: 'text-green-700',
      iconBg: 'bg-green-500',
    },
    {
      key: 'breedings',
      title: 'Reproducciones',
      value: stats.totalBreedings,
      icon: '💕',
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      iconBg: 'bg-pink-500',
    },
    {
      key: 'reminders',
      title: 'Recordatorios',
      value: `${stats.activeReminders}/${stats.totalReminders}`,
      icon: '⏰',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      iconBg: 'bg-yellow-500',
    },
    {
      key: 'invitations',
      title: 'Invitaciones',
      value: stats.totalInvitations,
      icon: '✉️',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      iconBg: 'bg-purple-500',
    },
    {
      key: 'sales',
      title: 'Ventas',
      value: stats.totalSales,
      icon: '💲',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      iconBg: 'bg-indigo-500',
    },
  ] as const

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {primaryStats.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggle(s.key as any)}
            className={`${s.bg} rounded-lg p-3 border text-left transition-all ${
              isActive(s.key) ? 'ring-2 ring-offset-1 ring-gray-400 shadow-md' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`${s.iconBg} rounded-md p-1.5 text-white text-sm`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-500 truncate">{s.title}</p>
                <p className={`text-lg font-bold ${s.text} leading-tight`}>{s.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Drill-down panel */}
      {activePanel && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 animate-in fade-in duration-200">
          {activePanel === 'users' && <UsersPanel users={stats.users} />}
          {activePanel === 'farms' && (
            <FarmsPanel
              farms={stats.farms}
              onSelectFarm={(f) => toggle({ type: 'farm', farm: f })}
            />
          )}
          {activePanel === 'species' && (
            <SpeciesPanel breakdown={stats.speciesBreakdown} total={stats.totalAnimals} />
          )}
          {activePanel === 'invitations' && (
            <InvitationsPanel
              invitations={stats.invitations}
              byStatus={stats.invitationsByStatus}
            />
          )}
          {activePanel === 'sales' && (
            <SalesPanel sales={stats.sales} byStatus={stats.salesByStatus} />
          )}
          {activePanel === 'breedings' && (
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">
                Reproducciones: {stats.totalBreedings}
              </p>
              <p className="text-gray-500">Ve a la sección Reproducciones para ver detalles.</p>
            </div>
          )}
          {activePanel === 'reminders' && (
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">
                Recordatorios activos: {stats.activeReminders} de {stats.totalReminders}
              </p>
              <p className="text-gray-500">Ve a la sección Recordatorios para ver detalles.</p>
            </div>
          )}
          {typeof activePanel === 'object' && activePanel.type === 'farm' && (
            <FarmDetailPanel farm={activePanel.farm} onBack={() => toggle('farms')} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Panels ──

function UsersPanel({
  users,
}: {
  users: { id: string; email: string; farmName?: string; createdAt: Date }[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Usuarios ({users.length})</h3>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Granja</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-1.5 text-gray-700">{u.email}</td>
                <td className="px-3 py-1.5 text-gray-500">{u.farmName || '—'}</td>
                <td className="px-3 py-1.5 text-gray-400 text-xs">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FarmsPanel({
  farms,
  onSelectFarm,
}: {
  farms: AdminFarmInfo[]
  onSelectFarm: (f: AdminFarmInfo) => void
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Granjas ({farms.length})</h3>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Nombre</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Dueño</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">Animales</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                Colaboradores
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {farms.map((f) => (
              <tr
                key={f.id}
                onClick={() => onSelectFarm(f)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-1.5 font-medium text-gray-900">{f.name || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{f.ownerEmail || f.ownerId}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{f.animalCount}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{f.collaborators.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FarmDetailPanel({ farm, onBack }: { farm: AdminFarmInfo; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-900">🚜 {farm.name}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Dueño" value={farm.ownerEmail || farm.ownerId} />
        <Stat label="Animales" value={farm.animalCount} />
        <Stat label="Colaboradores" value={farm.collaborators.length} />
        <Stat label="Creada" value={fmtDate(farm.createdAt)} />
      </div>

      {farm.collaborators.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Colaboradores</p>
          <div className="space-y-1">
            {farm.collaborators.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm"
              >
                <span className="text-gray-700">{c.email || c.userId}</span>
                <span className="text-xs text-gray-500 capitalize">{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpeciesPanel({
  breakdown,
  total,
}: {
  breakdown: { type: string; count: number }[]
  total: number
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Especies — {total} animales</h3>
      <div className="space-y-2">
        {breakdown.map(({ type, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={type} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">
                {animal_icon[type as keyof typeof animal_icon] || '🐾'}
              </span>
              <span className="text-sm text-gray-700 w-24">
                {animals_types_labels[type as keyof typeof animals_types_labels] || type}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 rounded-full h-2 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 w-16 text-right">
                {count} ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InvitationsPanel({
  invitations,
  byStatus,
}: {
  invitations: AdminInvitationInfo[]
  byStatus: Record<string, number>
}) {
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired: 'Expirada',
    revoked: 'Revocada',
  }
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-600',
    revoked: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Invitaciones ({invitations.length})</h3>
        <div className="flex gap-1.5">
          {Object.entries(byStatus).map(([s, c]) => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s] || 'bg-gray-100 text-gray-600'}`}
            >
              {statusLabels[s] || s} {c}
            </span>
          ))}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Granja</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Rol</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invitations.map((inv) => (
              <tr key={inv.id}>
                <td className="px-3 py-1.5 text-gray-700">{inv.email}</td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{inv.farmName || inv.farmId}</td>
                <td className="px-3 py-1.5 text-gray-500 text-xs capitalize">{inv.role}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusLabels[inv.status] || inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SalesPanel({
  sales,
  byStatus,
}: {
  sales: AdminSaleInfo[]
  byStatus: Record<string, number>
}) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Ventas ({sales.length})</h3>
        <div className="flex gap-1.5">
          {Object.entries(byStatus).map(([s, c]) => (
            <span
              key={s}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s] || 'bg-gray-100 text-gray-600'}`}
            >
              {sale_status_labels[s as keyof typeof sale_status_labels] || s} {c}
            </span>
          ))}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Granja</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">Animales</th>
              <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">$/kg</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Comprador</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Fecha</th>
              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-1.5 text-gray-700 text-xs">{s.farmName || s.farmId}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">{s.animalCount}</td>
                <td className="px-3 py-1.5 text-right text-gray-700">
                  {s.pricePerKg ? `$${(s.pricePerKg / 100).toFixed(2)}` : '—'}
                </td>
                <td className="px-3 py-1.5 text-gray-500 text-xs">{s.buyer || '—'}</td>
                <td className="px-3 py-1.5 text-gray-400 text-xs">
                  {s.date ? fmtDate(s.date) : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {sale_status_labels[s.status as keyof typeof sale_status_labels] || s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Helpers ──

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[10px] font-medium text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  )
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
