'use client'

import { collection, getDocs } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { animal_icon, animal_status_labels, animals_types_labels } from '@/types/animals'
import { sale_status_labels } from '@/types/sales'

// ── Types ──

interface BreadcrumbItem {
  label: string
  icon?: string
  key: string
}

interface CardItem {
  key: string
  label: string
  icon: string
  value: number | string
  bg: string
  text: string
}

interface DetailRow {
  key: string
  label: string
  icon?: string
  value: number | string
  drillable?: boolean
  meta?: Record<string, any>
}

interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

interface TableRow {
  key: string
  cells: Record<string, string | number>
  drillable?: boolean
  drillLabel?: string
  drillIcon?: string
}

interface TableView {
  columns: TableColumn[]
  data: TableRow[]
}

// ── Main Component ──

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [rawData, setRawData] = useState<Record<string, any[]>>({})
  const [path, setPath] = useState<BreadcrumbItem[]>([])

  // Fetch all data once
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      const [
        usersSnap,
        animalsSnap,
        farmsSnap,
        breedingsSnap,
        remindersSnap,
        invitationsSnap,
        salesSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'animals')),
        getDocs(collection(db, 'farms')),
        getDocs(collection(db, 'breedingRecords')),
        getDocs(collection(db, 'reminders')),
        getDocs(collection(db, 'farmInvitations')),
        getDocs(collection(db, 'sales')),
      ])

      const mapSnap = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))

      setRawData({
        users: mapSnap(usersSnap),
        animals: mapSnap(animalsSnap),
        farms: mapSnap(farmsSnap),
        breedings: mapSnap(breedingsSnap),
        reminders: mapSnap(remindersSnap),
        invitations: mapSnap(invitationsSnap),
        sales: mapSnap(salesSnap),
      })
      setIsLoading(false)
    }
    fetchAll()
  }, [])

  const drillInto = useCallback((item: BreadcrumbItem) => {
    setPath((prev) => [...prev, item])
  }, [])

  const goTo = useCallback((index: number) => {
    setPath((prev) => prev.slice(0, index))
  }, [])

  // ── Table builders ──

  const buildAnimalTable = (list: any[]): TableView => ({
    columns: [
      { key: 'number', label: 'Arete', sortable: true },
      { key: 'name', label: 'Nombre', sortable: true },
      { key: 'type', label: 'Especie', sortable: true },
      { key: 'stage', label: 'Etapa', sortable: true },
      { key: 'gender', label: 'Sexo', sortable: true },
      { key: 'status', label: 'Estado', sortable: true },
      { key: 'weight', label: 'Peso (kg)', align: 'right', sortable: true },
    ],
    data: list.map((a: any) => ({
      key: a.id,
      cells: {
        number: a.animalNumber || '',
        name: a.name || '',
        type: animals_types_labels[a.type as keyof typeof animals_types_labels] || a.type || '',
        stage: a.stage || '',
        gender: a.gender || '',
        status:
          animal_status_labels[a.status as keyof typeof animal_status_labels] ||
          a.status ||
          'activo',
        weight: a.weight ? (Number(a.weight) / 1000).toFixed(1) : '',
      },
    })),
  })

  // ── Resolve current view based on path ──

  const resolve = useCallback((): {
    cards?: CardItem[]
    rows?: DetailRow[]
    table?: TableView
    title?: string
  } => {
    const {
      users = [],
      animals = [],
      farms = [],
      breedings = [],
      reminders = [],
      invitations = [],
      sales = [],
    } = rawData

    const userMap = new Map(users.map((u: any) => [u.id, u]))
    const farmMap = new Map(farms.map((f: any) => [f.id, f]))

    if (path.length === 0) {
      // Root level — summary cards
      const activeReminders = reminders.filter((r: any) => !r.completed).length
      return {
        cards: [
          {
            key: 'users',
            label: 'Usuarios',
            icon: '👥',
            value: users.length,
            bg: 'bg-blue-50',
            text: 'text-blue-700',
          },
          {
            key: 'farms',
            label: 'Granjas',
            icon: '🚜',
            value: farms.length,
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
          },
          {
            key: 'species',
            label: 'Especies',
            icon: '🐾',
            value: new Set(animals.map((a: any) => a.type)).size,
            bg: 'bg-green-50',
            text: 'text-green-700',
          },
          {
            key: 'breedings',
            label: 'Reproducciones',
            icon: '💕',
            value: breedings.length,
            bg: 'bg-pink-50',
            text: 'text-pink-700',
          },
          {
            key: 'reminders',
            label: 'Recordatorios',
            icon: '⏰',
            value: `${activeReminders}/${reminders.length}`,
            bg: 'bg-yellow-50',
            text: 'text-yellow-700',
          },
          {
            key: 'invitations',
            label: 'Invitaciones',
            icon: '✉️',
            value: invitations.length,
            bg: 'bg-purple-50',
            text: 'text-purple-700',
          },
          {
            key: 'sales',
            label: 'Ventas',
            icon: '💲',
            value: sales.length,
            bg: 'bg-indigo-50',
            text: 'text-indigo-700',
          },
        ],
      }
    }

    const root = path[0].key

    // ── Users ──
    if (root === 'users') {
      if (path.length === 1) {
        return {
          title: `Usuarios (${users.length})`,
          table: {
            columns: [
              { key: 'email', label: 'Email', sortable: true },
              { key: 'farmName', label: 'Granja', sortable: true },
              { key: 'farms', label: 'Granjas', align: 'right' as const, sortable: true },
              { key: 'animals', label: 'Animales', align: 'right' as const, sortable: true },
            ],
            data: users.map((u: any) => {
              const userFarms = farms.filter((f: any) => f.ownerId === u.id).length
              const userAnimals = animals.filter((a: any) => a.farmerId === u.id).length
              return {
                key: u.id,
                cells: {
                  email: u.email || '',
                  farmName: u.farmName || '',
                  farms: userFarms,
                  animals: userAnimals,
                },
              }
            }),
          },
        }
      }
      const userId = path[1].key
      const u = users.find((x: any) => x.id === userId)
      const userFarms = farms.filter((f: any) => f.ownerId === userId)
      const userAnimals = animals.filter((a: any) => a.farmerId === userId)
      return {
        title: u?.email || userId,
        rows: [
          { key: 'email', label: 'Email', value: u?.email || '—' },
          { key: 'farmName', label: 'Nombre granja', value: u?.farmName || '—' },
          { key: 'farms', label: 'Granjas propias', value: userFarms.length },
          { key: 'animals', label: 'Animales', value: userAnimals.length },
        ],
      }
    }

    // ── Farms ──
    if (root === 'farms') {
      if (path.length === 1) {
        return {
          title: `Granjas (${farms.length})`,
          table: {
            columns: [
              { key: 'name', label: 'Nombre', sortable: true },
              { key: 'owner', label: 'Dueño', sortable: true },
              { key: 'animals', label: 'Animales', align: 'right' as const, sortable: true },
              { key: 'collabs', label: 'Colaboradores', align: 'right' as const, sortable: true },
            ],
            data: farms.map((f: any) => {
              const owner = userMap.get(f.ownerId)
              return {
                key: f.id,
                drillable: true,
                drillLabel: f.name || '(sin nombre)',
                drillIcon: '🚜',
                cells: {
                  name: f.name || '(sin nombre)',
                  owner: owner?.email || f.ownerId || '',
                  animals: animals.filter((a: any) => a.farmId === f.id).length,
                  collabs: f.collaborators?.length || 0,
                },
              }
            }),
          },
        }
      }
      const farmId = path[1].key
      const farm = farms.find((f: any) => f.id === farmId)
      const farmAnimals = animals.filter((a: any) => a.farmId === farmId)
      const farmBreedings = breedings.filter((b: any) => b.farmId === farmId)
      const farmSales = sales.filter((s: any) => s.farmId === farmId)
      const farmInvitations = invitations.filter((i: any) => i.farmId === farmId)
      const owner = userMap.get(farm?.ownerId)

      if (path.length === 2) {
        // Farm detail — show categories to drill into
        const speciesSet = new Map<string, number>()
        for (const a of farmAnimals) {
          speciesSet.set(a.type, (speciesSet.get(a.type) || 0) + 1)
        }
        const rows: DetailRow[] = [
          { key: 'owner', label: 'Dueño', value: owner?.email || farm?.ownerId || '—' },
          {
            key: 'collabs',
            label: 'Colaboradores',
            value: farm?.collaborators?.length || 0,
            drillable: (farm?.collaborators?.length || 0) > 0,
          },
          {
            key: 'animals',
            label: 'Animales',
            value: farmAnimals.length,
            drillable: farmAnimals.length > 0,
          },
          ...Array.from(speciesSet.entries()).map(([type, count]) => ({
            key: `species-${type}`,
            label: `${animal_icon[type as keyof typeof animal_icon] || '🐾'} ${animals_types_labels[type as keyof typeof animals_types_labels] || type}`,
            value: count,
            drillable: true,
          })),
          { key: 'breedings', label: 'Reproducciones', value: farmBreedings.length },
          {
            key: 'sales',
            label: 'Ventas',
            value: farmSales.length,
            drillable: farmSales.length > 0,
          },
          {
            key: 'invitations',
            label: 'Invitaciones',
            value: farmInvitations.length,
            drillable: farmInvitations.length > 0,
          },
        ]
        return { title: farm?.name || farmId, rows }
      }

      const subKey = path[2].key
      if (subKey === 'collabs') {
        return {
          title: 'Colaboradores',
          rows: (farm?.collaborators || []).map((c: any, i: number) => ({
            key: `c-${i}`,
            label: c.email || c.userId,
            value: c.role,
          })),
        }
      }
      if (subKey === 'animals' || subKey.startsWith('species-')) {
        const list =
          subKey === 'animals'
            ? farmAnimals
            : farmAnimals.filter((a: any) => a.type === subKey.replace('species-', ''))
        const typeLabel =
          subKey === 'animals'
            ? 'Animales'
            : animals_types_labels[
                subKey.replace('species-', '') as keyof typeof animals_types_labels
              ] || subKey
        return {
          title: `${typeLabel} (${list.length})`,
          table: buildAnimalTable(list),
        }
      }
      if (subKey === 'sales') {
        return {
          title: `Ventas (${farmSales.length})`,
          rows: farmSales.map((s: any) => ({
            key: s.id,
            label: s.buyer || '(sin comprador)',
            value: sale_status_labels[s.status as keyof typeof sale_status_labels] || s.status,
            meta: { animals: s.animals?.length || 0, pricePerKg: s.pricePerKg },
          })),
        }
      }
      if (subKey === 'invitations') {
        return {
          title: `Invitaciones (${farmInvitations.length})`,
          rows: farmInvitations.map((i: any) => ({
            key: i.id,
            label: i.email,
            value: i.status,
          })),
        }
      }
    }

    // ── Species ──
    if (root === 'species') {
      if (path.length === 1) {
        const speciesMap = new Map<string, number>()
        for (const a of animals) speciesMap.set(a.type, (speciesMap.get(a.type) || 0) + 1)
        return {
          title: `Especies (${speciesMap.size})`,
          rows: Array.from(speciesMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({
              key: type,
              label: animals_types_labels[type as keyof typeof animals_types_labels] || type,
              icon: animal_icon[type as keyof typeof animal_icon] || '🐾',
              value: `${count} (${Math.round((count / animals.length) * 100)}%)`,
              drillable: true,
            })),
        }
      }
      const type = path[1].key
      const filtered = animals.filter((a: any) => a.type === type)
      // Group by farm
      const byFarm = new Map<string, number>()
      for (const a of filtered) {
        const fname = farmMap.get(a.farmId)?.name || a.farmId || 'Sin granja'
        byFarm.set(fname, (byFarm.get(fname) || 0) + 1)
      }
      return {
        title: `${animals_types_labels[type as keyof typeof animals_types_labels] || type} (${filtered.length})`,
        rows: Array.from(byFarm.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({
            key: name,
            label: name,
            icon: '🚜',
            value: count,
          })),
      }
    }

    // ── Invitations ──
    if (root === 'invitations') {
      const statusLabels: Record<string, string> = {
        pending: 'Pendiente',
        accepted: 'Aceptada',
        rejected: 'Rechazada',
        expired: 'Expirada',
        revoked: 'Revocada',
      }
      if (path.length === 1) {
        const byStatus = new Map<string, number>()
        for (const i of invitations) byStatus.set(i.status, (byStatus.get(i.status) || 0) + 1)
        return {
          title: `Invitaciones (${invitations.length})`,
          rows: Array.from(byStatus.entries()).map(([status, count]) => ({
            key: status,
            label: statusLabels[status] || status,
            value: count,
            drillable: true,
          })),
        }
      }
      const status = path[1].key
      const filtered = invitations.filter((i: any) => i.status === status)
      return {
        title: `${statusLabels[status] || status} (${filtered.length})`,
        rows: filtered.map((i: any) => ({
          key: i.id,
          label: i.email,
          value: farmMap.get(i.farmId)?.name || i.farmId,
          meta: { role: i.role },
        })),
      }
    }

    // ── Sales ──
    if (root === 'sales') {
      if (path.length === 1) {
        const byStatus = new Map<string, number>()
        for (const s of sales) byStatus.set(s.status, (byStatus.get(s.status) || 0) + 1)
        return {
          title: `Ventas (${sales.length})`,
          rows: Array.from(byStatus.entries()).map(([status, count]) => ({
            key: status,
            label: sale_status_labels[status as keyof typeof sale_status_labels] || status,
            value: count,
            drillable: true,
          })),
        }
      }
      const status = path[1].key
      const filtered = sales.filter((s: any) => s.status === status)
      return {
        title: `${sale_status_labels[status as keyof typeof sale_status_labels] || status} (${filtered.length})`,
        rows: filtered.map((s: any) => ({
          key: s.id,
          label: `${farmMap.get(s.farmId)?.name || '—'} — ${s.buyer || '(sin comprador)'}`,
          value: `${s.animals?.length || 0} animales`,
          meta: { pricePerKg: s.pricePerKg },
        })),
      }
    }

    // ── Breedings / Reminders — simple list ──
    if (root === 'breedings') {
      return {
        title: `Reproducciones (${breedings.length})`,
        rows: breedings.slice(0, 50).map((b: any) => ({
          key: b.id,
          label: farmMap.get(b.farmId)?.name || b.farmId || '—',
          value: `${b.femaleBreedingInfo?.length || 0} hembras`,
        })),
      }
    }
    if (root === 'reminders') {
      const active = reminders.filter((r: any) => !r.completed)
      return {
        title: `Recordatorios activos (${active.length}/${reminders.length})`,
        rows: active.slice(0, 50).map((r: any) => ({
          key: r.id,
          label: r.title,
          value: r.priority || '—',
        })),
      }
    }

    return {}
  }, [rawData, path])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const view = resolve()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <h1 className="text-lg font-semibold text-gray-900">🏪 Panel Administrativo</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">{user?.email}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Admin
              </span>
              <button onClick={logout} className="text-gray-400 hover:text-gray-600">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Breadcrumbs */}
        {path.length > 0 && (
          <nav className="flex items-center gap-1 text-sm mb-4">
            <button
              onClick={() => goTo(0)}
              className="text-blue-600 hover:text-blue-800 font-medium"
              type="button"
            >
              Resumen
            </button>
            {path.map((item, i) => (
              <span key={item.key} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                {i < path.length - 1 ? (
                  <button
                    onClick={() => goTo(i + 1)}
                    className="text-blue-600 hover:text-blue-800"
                    type="button"
                  >
                    {item.icon && <span className="mr-0.5">{item.icon}</span>}
                    {item.label}
                  </button>
                ) : (
                  <span className="text-gray-900 font-medium">
                    {item.icon && <span className="mr-0.5">{item.icon}</span>}
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Cards (root level) — shown small when drilled in */}
        {view.cards && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {view.cards.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => drillInto({ key: card.key, label: card.label, icon: card.icon })}
                className={`${card.bg} rounded-lg p-4 border text-left hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{card.icon}</span>
                  <div>
                    <p className="text-[10px] font-medium text-gray-500">{card.label}</p>
                    <p className={`text-xl font-bold ${card.text} leading-tight`}>{card.value}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail rows */}
        {/* Table view */}
        {view.table && (
          <div>
            {view.title && (
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{view.title}</h2>
            )}
            <SortableTable table={view.table} onDrill={drillInto} />
          </div>
        )}

        {/* Detail rows */}
        {view.rows && !view.table && (
          <div>
            {view.title && (
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{view.title}</h2>
            )}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
                {view.rows.map((row) => (
                  <div
                    key={row.key}
                    onClick={
                      row.drillable
                        ? () => drillInto({ key: row.key, label: row.label, icon: row.icon })
                        : undefined
                    }
                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 ${
                      row.drillable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {row.icon && <span className="text-base shrink-0">{row.icon}</span>}
                      <span className="text-sm text-gray-900 truncate">{row.label}</span>
                      {row.meta?.role && (
                        <span className="text-xs text-gray-400 capitalize">
                          ({String(row.meta.role)})
                        </span>
                      )}
                      {row.meta?.ownerEmail && (
                        <span className="text-xs text-gray-400">
                          — {String(row.meta.ownerEmail)}
                        </span>
                      )}
                      {row.meta?.pricePerKg && (
                        <span className="text-xs text-gray-400">
                          ${(Number(row.meta.pricePerKg) / 100).toFixed(2)}/kg
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-600">{row.value}</span>
                      {row.drillable && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 text-gray-400"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
                {view.rows.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">Sin datos</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SortableTable ──

function SortableTable({
  table,
  onDrill,
}: {
  table: TableView
  onDrill?: (item: BreadcrumbItem) => void
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = table.data.filter((row) => {
    if (!search) return true
    const q = search.toLowerCase()
    return Object.values(row.cells).some((v) => String(v).toLowerCase().includes(q))
  })

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a.cells[sortKey] ?? ''
        const bv = b.cells[sortKey] ?? ''
        const numA = Number(av)
        const numB = Number(bv)
        const cmp =
          !Number.isNaN(numA) && !Number.isNaN(numB) && av !== '' && bv !== ''
            ? numA - numB
            : String(av).localeCompare(String(bv), 'es')
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <span className="ml-2 text-xs text-gray-400">
          {sorted.length} de {table.data.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row) => (
              <tr
                key={row.key}
                onClick={
                  row.drillable && onDrill
                    ? () =>
                        onDrill({
                          key: row.key,
                          label: row.drillLabel || String(Object.values(row.cells)[0]),
                          icon: row.drillIcon,
                        })
                    : undefined
                }
                className={`hover:bg-gray-50 transition-colors ${row.drillable ? 'cursor-pointer' : ''}`}
              >
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 text-gray-700 whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {row.cells[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {search ? 'Sin resultados para la búsqueda' : 'Sin datos'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
