'use client'

import { computeUsageMetrics } from '@mi-granja/shared'
import {
  collection,
  deleteDoc,
  doc as firestoreDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { auth, db } from '@/lib/firebase'
import { animal_icon, animal_status_labels, animals_types_labels } from '@/types/animals'
import { PLAN_TIERS, type PlanTier, type PlanTierId } from '@/types/billing'
import { sale_status_labels } from '@/types/sales'
import AdminPricing from './AdminPricing'
import AdminUserActions from './AdminUserActions'

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
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
}

type MarketingTemplate = 'basic' | 'app_updates'

function getMarketingTemplateDefaults(template: MarketingTemplate) {
  if (template === 'app_updates') {
    return {
      subject: 'Nuevas actualizaciones en Mi Granja',
      message: [
        'Hola, seguimos mejorando Mi Granja para que administres tu operación con menos trabajo manual.',
        '',
        '- Inicio de sesión con Google para entrar más rápido.',
        '- Mejoras en el asistente para consultar información de tu granja.',
        '- Nuevas herramientas administrativas para comunicar avisos importantes.',
      ].join('\n'),
      ctaText: 'Ver actualizaciones',
      ctaUrl: 'https://dashboard.migranja.app',
    }
  }

  return {
    subject: 'Mensaje de Mi Granja',
    message:
      'Hola,\n\nQueremos compartirte una actualización importante de Mi Granja.\n\nGracias por seguir usando la app para administrar tu granja.',
    ctaText: 'Abrir Mi Granja',
    ctaUrl: 'https://dashboard.migranja.app',
  }
}

function formatDate(raw: any): string {
  const d = raw?.toDate?.() || raw
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    // YYYY-MM-DD format sorts correctly as string
    return d.toISOString().slice(0, 10)
  }
  return '—'
}

// ── Main Component ──

export default function AdminDashboard() {
  const { notify } = useAppFeedback()
  const { user, logout } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [rawData, setRawData] = useState<Record<string, any[]>>({})
  const [path, setPath] = useState<BreadcrumbItem[]>([])

  // User action modals
  const [actionUser, setActionUser] = useState<any>(null)
  const [planUser, setPlanUser] = useState<any>(null)
  const [planData, setPlanData] = useState<{
    tierId: PlanTierId
    planType: string
    animalCount: number
    requiredTierId: PlanTierId
    animalLimit: number | null
    actualFarmCount: number
    actualCollaboratorCount: number
  } | null>(null)
  const [tierInput, setTierInput] = useState<PlanTierId>('free')
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false)
  const [marketingUser, setMarketingUser] = useState<any | null>(null)
  const [marketingSubject, setMarketingSubject] = useState('')
  const [marketingMessage, setMarketingMessage] = useState('')
  const [marketingCtaText, setMarketingCtaText] = useState('')
  const [marketingCtaUrl, setMarketingCtaUrl] = useState('')
  const [marketingTemplate, setMarketingTemplate] = useState<MarketingTemplate>('basic')
  const [isSendingMarketingEmail, setIsSendingMarketingEmail] = useState(false)
  const [marketingResult, setMarketingResult] = useState<string | null>(null)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [billingTiers, setBillingTiers] = useState<PlanTier[]>(PLAN_TIERS)

  // Hard delete modal
  const [deleteFarm, setDeleteFarm] = useState<any>(null)
  const [isDeletingFarm, setIsDeletingFarm] = useState(false)

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
        subsSnap,
        campaignsSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'animals')),
        getDocs(collection(db, 'farms')),
        getDocs(collection(db, 'breedingRecords')),
        getDocs(collection(db, 'reminders')),
        getDocs(collection(db, 'farmInvitations')),
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'subscriptions')),
        getDocs(collection(db, 'marketingEmailCampaigns')),
      ])

      const mapSnap = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))

      // Build tier map from subscriptions
      const subsMap = new Map<string, PlanTierId>()
      subsSnap.docs.forEach((d: any) => {
        const data = d.data()
        subsMap.set(data.userId ?? d.id, data.tierId ?? 'free')
      })

      // Inject billing tier into users
      const usersWithPlaces = mapSnap(usersSnap).map((u: any) => ({
        ...u,
        tierId: subsMap.get(u.id) ?? 'free',
      }))

      setRawData({
        users: usersWithPlaces,
        animals: mapSnap(animalsSnap),
        farms: mapSnap(farmsSnap),
        breedings: mapSnap(breedingsSnap),
        reminders: mapSnap(remindersSnap),
        invitations: mapSnap(invitationsSnap),
        sales: mapSnap(salesSnap),
        campaigns: mapSnap(campaignsSnap),
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

  // ── Plan modal helpers ──

  const openPlanModal = useCallback(async (u: any) => {
    setPlanUser(u)
    setPlanData(null)
    setTierInput('free')
    setIsLoadingPlan(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch(`/api/admin/billing?userId=${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPlanData(data)
        setTierInput(data.tierId)
      }
    } catch (err) {
      console.error('Error cargando plan:', err)
    } finally {
      setIsLoadingPlan(false)
    }
  }, [])

  const handleSavePlan = async () => {
    if (!planUser) return
    setIsSavingPlan(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: planUser.id, tierId: tierInput }),
      })
      if (res.ok) {
        setPlanUser(null)
        notify('Plan actualizado correctamente', 'success')
      } else {
        const data = await res.json()
        notify(data.error || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando plan:', err)
      notify('Error al guardar el plan')
    } finally {
      setIsSavingPlan(false)
    }
  }

  const loadCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true)
    try {
      const snap = await getDocs(collection(db, 'marketingEmailCampaigns'))
      const campaigns = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      setRawData((prev: any) => ({ ...prev, campaigns }))
    } catch (err) {
      console.error('Error cargando campañas:', err)
    } finally {
      setIsLoadingCampaigns(false)
    }
  }, [])

  const resetMarketingForm = useCallback((targetUser?: any) => {
    const defaults = getMarketingTemplateDefaults('basic')
    setMarketingUser(targetUser || null)
    setMarketingSubject(defaults.subject)
    setMarketingMessage(defaults.message)
    setMarketingCtaText(defaults.ctaText)
    setMarketingCtaUrl(defaults.ctaUrl)
    setMarketingTemplate('basic')
    setMarketingResult(null)
  }, [])

  const openMarketingModal = useCallback(
    (targetUser?: any) => {
      resetMarketingForm(targetUser)
      setIsMarketingModalOpen(true)
    },
    [resetMarketingForm],
  )

  // Recarga real del historial al entrar a la pestaña Email marketing
  useEffect(() => {
    if (path[0]?.key === 'marketing') loadCampaigns()
  }, [path, loadCampaigns])

  const closeMarketingModal = () => {
    if (isSendingMarketingEmail) return
    setIsMarketingModalOpen(false)
    setMarketingUser(null)
    setMarketingSubject('')
    setMarketingMessage('')
    setMarketingCtaText('')
    setMarketingCtaUrl('')
    setMarketingTemplate('basic')
    setMarketingResult(null)
  }

  const applyMarketingTemplate = (template: MarketingTemplate) => {
    const defaults = getMarketingTemplateDefaults(template)
    setMarketingTemplate(template)
    setMarketingResult(null)
    setMarketingSubject(defaults.subject)
    setMarketingMessage(defaults.message)
    setMarketingCtaText(defaults.ctaText)
    setMarketingCtaUrl(defaults.ctaUrl)
  }

  const handleSendMarketingEmail = async () => {
    if (!marketingSubject.trim() || !marketingMessage.trim()) {
      notify('Completa asunto y mensaje', 'info')
      return
    }

    setIsSendingMarketingEmail(true)
    setMarketingResult(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        notify('No hay sesión activa')
        return
      }

      const res = await fetch('/api/admin/marketing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientMode: marketingUser ? 'userIds' : 'all',
          userIds: marketingUser ? [marketingUser.id] : undefined,
          subject: marketingSubject,
          message: marketingMessage,
          ctaText: marketingCtaText || undefined,
          ctaUrl: marketingCtaUrl || undefined,
          template: marketingTemplate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify(data.error || 'Error enviando email marketing')
        return
      }
      setMarketingResult(`Enviados: ${data.sent} de ${data.recipients}. Fallidos: ${data.failed}.`)
      notify('Campaña enviada correctamente', 'success')
      // Reflejar la campaña recién enviada en el historial sin recargar
      setRawData((prev: any) => ({
        ...prev,
        campaigns: [
          {
            id: `local-${data.sent}-${data.recipients}-${data.failed}`,
            subject: marketingSubject,
            template: marketingTemplate,
            recipientMode: marketingUser ? 'userIds' : 'all',
            requestedRecipients: data.recipients,
            sent: data.sent,
            failed: data.failed,
            dryRun: false,
            createdByEmail: user?.email,
            createdAt: new Date(),
          },
          ...(prev.campaigns || []),
        ],
      }))
    } catch (err) {
      console.error('Error enviando email marketing:', err)
      notify('Error enviando email marketing')
    } finally {
      setIsSendingMarketingEmail(false)
    }
  }

  // Hard delete — eliminar granja y todos sus datos permanentemente
  const handleHardDelete = async (farmId: string) => {
    setIsDeletingFarm(true)
    try {
      const collections = ['animals', 'breedingRecords', 'reminders', 'sales', 'farmInvitations']
      for (const col of collections) {
        const snap = await getDocs(query(collection(db, col), where('farmId', '==', farmId)))
        // Batch delete in groups of 500
        const batch = writeBatch(db)
        let count = 0
        for (const d of snap.docs) {
          batch.delete(d.ref)
          count++
          if (count >= 499) {
            await batch.commit()
            count = 0
          }
        }
        if (count > 0) await batch.commit()
      }
      // Delete the farm doc
      await deleteDoc(firestoreDoc(db, 'farms', farmId))

      // Refresh data
      setDeleteFarm(null)
      // Re-fetch all data
      const farmsSnap = await getDocs(collection(db, 'farms'))
      const mapSnap = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      setRawData((prev) => ({ ...prev, farms: mapSnap(farmsSnap) }))
    } catch (err) {
      console.error('Error eliminando granja:', err)
      notify('Error al eliminar la granja')
    } finally {
      setIsDeletingFarm(false)
    }
  }

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
      { key: 'createdAt', label: 'Registro', sortable: true },
      { key: 'updatedAt', label: 'Actualizado', sortable: true },
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
        createdAt: formatDate(a.createdAt),
        updatedAt: formatDate(a.updatedAt),
      },
    })),
  })

  // ── Summary cards (always visible) ──

  // Métricas de uso derivadas (sin tracking nuevo). Recalcula al cambiar los datos.
  const usage = useMemo(() => computeUsageMetrics(rawData, new Date()), [rawData])

  const summaryCards = useCallback((): CardItem[] => {
    const {
      users = [],
      animals = [],
      farms = [],
      breedings = [],
      reminders = [],
      invitations = [],
      sales = [],
      campaigns = [],
    } = rawData

    const activeReminders = reminders.filter((r: any) => !r.completed).length
    const deletedCount = farms.filter((f: any) => f.deletedAt).length
    const result: CardItem[] = [
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
      {
        key: 'marketing',
        label: 'Email marketing',
        icon: '📣',
        value: campaigns.length,
        bg: 'bg-teal-50',
        text: 'text-teal-700',
      },
      {
        key: 'pricing',
        label: 'Precios',
        icon: '💳',
        value: billingTiers.length,
        bg: 'bg-lime-50',
        text: 'text-lime-800',
      },
      {
        key: 'usage',
        label: 'Uso (activos 30d)',
        icon: '📊',
        value: `${usage.activity.active30}/${usage.totalUsers}`,
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
      },
    ]
    if (deletedCount > 0) {
      result.push({
        key: 'deletions',
        label: 'Eliminaciones',
        icon: '🗑️',
        value: deletedCount,
        bg: 'bg-red-50',
        text: 'text-red-700',
      })
    }
    return result
  }, [billingTiers.length, rawData, usage])

  // ── Resolve current view based on path ──

  const resolve = useCallback((): {
    rows?: DetailRow[]
    table?: TableView
    title?: string
    userId?: string
  } => {
    const {
      users = [],
      animals = [],
      farms = [],
      breedings = [],
      reminders = [],
      invitations = [],
      sales = [],
      campaigns = [],
    } = rawData

    const userMap = new Map(users.map((u: any) => [u.id, u]))
    const farmMap = new Map(farms.map((f: any) => [f.id, f]))

    if (path.length === 0) {
      return {}
    }

    const root = path[0].key

    // ── Users ──
    if (root === 'users') {
      if (path.length === 1) {
        return {
          title: `Usuarios (${users.length})`,
          table: {
            defaultSortKey: 'createdAt',
            defaultSortDir: 'desc' as const,
            columns: [
              { key: 'email', label: 'Email', sortable: true },
              { key: 'plan', label: 'Plan', sortable: true },
              { key: 'tier', label: 'Tier', sortable: true },
              { key: 'farms', label: 'Granjas', align: 'right' as const, sortable: true },
              { key: 'animals', label: 'Animales', align: 'right' as const, sortable: true },
              { key: 'createdAt', label: 'Registro', sortable: true },
              { key: 'lastActivity', label: 'Último movimiento', sortable: true },
            ],
            data: users.map((u: any) => {
              const userFarms = farms.filter((f: any) => f.ownerId === u.id).length
              const userAnimals = animals.filter((a: any) => a.farmerId === u.id)
              const latestAnimal = userAnimals.reduce((max: any, a: any) => {
                const aDate = a.updatedAt?.toDate?.() || a.updatedAt
                const maxDate = max?.updatedAt?.toDate?.() || max?.updatedAt
                if (!maxDate) return a
                if (!aDate) return max
                return aDate > maxDate ? a : max
              }, null)
              return {
                key: u.id,
                drillable: true,
                drillLabel: u.email || u.id,
                drillIcon: '👤',
                cells: {
                  email: u.email || '',
                  plan: u.planType === 'pro' ? 'Pro' : 'Free',
                  tier: u.tierId ?? 'free',
                  farms: userFarms,
                  animals: userAnimals.length,
                  createdAt: formatDate(u.createdAt),
                  lastActivity: latestAnimal ? formatDate(latestAnimal.updatedAt) : '—',
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

      if (path.length === 2) {
        // User detail — show info + their farms as drillable rows
        const rows: DetailRow[] = [
          { key: 'email', label: 'Email', value: u?.email || '—' },
          { key: 'farmName', label: 'Nombre granja', value: u?.farmName || '—' },
          { key: 'totalAnimals', label: 'Total animales', value: userAnimals.length },
        ]

        for (const farm of userFarms) {
          const farmAnimalCount = animals.filter((a: any) => a.farmId === farm.id).length
          const collabCount = farm.collaborators?.length || 0
          rows.push({
            key: `farm-${farm.id}`,
            label: `🚜 ${farm.name || '(sin nombre)'}`,
            value: `${farmAnimalCount} animales${collabCount > 0 ? ` · ${collabCount} colab.` : ''}`,
            drillable: true,
          })
        }

        if (userFarms.length === 0) {
          rows.push({ key: 'no-farms', label: 'Sin granjas registradas', value: '—' })
        }

        return { title: u?.email || userId, rows, userId }
      }

      // path.length >= 3: drill into a specific farm from user context
      const farmKey = path[2].key
      if (farmKey.startsWith('farm-')) {
        const farmId = farmKey.replace('farm-', '')
        const farm = farms.find((f: any) => f.id === farmId)
        const farmAnimals = animals.filter((a: any) => a.farmId === farmId)
        const farmBreedings = breedings.filter((b: any) => b.farmId === farmId)
        const farmSales = sales.filter((s: any) => s.farmId === farmId)
        const farmInvitations = invitations.filter((i: any) => i.farmId === farmId)

        if (path.length === 3) {
          // Farm detail within user context
          const speciesSet = new Map<string, number>()
          for (const a of farmAnimals) {
            speciesSet.set(a.type, (speciesSet.get(a.type) || 0) + 1)
          }
          const rows: DetailRow[] = [
            {
              key: 'collabs',
              label: 'Colaboradores',
              value: farm?.collaborators?.length || 0,
              drillable: (farm?.collaborators?.length || 0) > 0,
            },
            {
              key: 'animals',
              label: 'Todos los animales',
              value: farmAnimals.length,
              drillable: farmAnimals.length > 0,
            },
            ...Array.from(speciesSet.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => ({
                key: `species-${type}`,
                label: `${animal_icon[type as keyof typeof animal_icon] || '🐾'} ${animals_types_labels[type as keyof typeof animals_types_labels] || type}`,
                value: count,
                drillable: true,
              })),
            { key: 'breedings', label: 'Reproducciones', value: farmBreedings.length },
            { key: 'sales', label: 'Ventas', value: farmSales.length },
            { key: 'invitations', label: 'Invitaciones', value: farmInvitations.length },
          ]
          return { title: farm?.name || farmId, rows }
        }

        // path.length >= 4: sub-drill within farm
        const subKey = path[3].key
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
      }

      return { title: u?.email || userId, rows: [] }
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
              { key: 'createdAt', label: 'Registro', sortable: true },
              { key: 'updatedAt', label: 'Actualizado', sortable: true },
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
                  createdAt: formatDate(f.createdAt),
                  updatedAt: formatDate(f.updatedAt),
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

      if (path.length === 2) {
        // Group by farm
        const byFarm = new Map<string, { name: string; count: number }>()
        for (const a of filtered) {
          const farmId = a.farmId || 'sin-granja'
          const existing = byFarm.get(farmId)
          if (existing) {
            existing.count++
          } else {
            byFarm.set(farmId, {
              name: farmMap.get(farmId)?.name || 'Sin granja',
              count: 1,
            })
          }
        }
        return {
          title: `${animals_types_labels[type as keyof typeof animals_types_labels] || type} (${filtered.length})`,
          rows: Array.from(byFarm.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([farmId, { name, count }]) => ({
              key: farmId,
              label: name,
              icon: '🚜',
              value: count,
              drillable: true,
            })),
        }
      }

      // path.length >= 3: show animal table for species + farm
      const farmId = path[2].key
      const farmAnimals =
        farmId === 'sin-granja'
          ? filtered.filter((a: any) => !a.farmId)
          : filtered.filter((a: any) => a.farmId === farmId)
      const farmName = farmMap.get(farmId)?.name || 'Sin granja'
      const typeLabel = animals_types_labels[type as keyof typeof animals_types_labels] || type
      return {
        title: `${typeLabel} — ${farmName} (${farmAnimals.length})`,
        table: buildAnimalTable(farmAnimals),
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

    // ── Email marketing ──
    if (root === 'marketing') {
      const sorted = [...campaigns].sort((a: any, b: any) => {
        const da = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
        const dbb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
        return dbb.getTime() - da.getTime()
      })
      return {
        title: `Campañas enviadas (${campaigns.length})`,
        rows: sorted.map((c: any) => {
          const templateLabel = c.template === 'app_updates' ? 'Actualizaciones' : 'Correo básico'
          const recipientLabel =
            c.recipientMode === 'all'
              ? 'Todos'
              : c.recipientMode === 'userIds'
                ? 'Usuario específico'
                : 'Correos manuales'
          return {
            key: c.id,
            label: c.subject || '(sin asunto)',
            value: `${c.sent ?? 0} enviados${(c.failed ?? 0) > 0 ? ` · ${c.failed} fallidos` : ''}`,
            meta: {
              campaignInfo: `${templateLabel} · ${recipientLabel} · ${formatDate(c.createdAt)}${
                c.createdByEmail ? ` · ${c.createdByEmail}` : ''
              }${c.dryRun ? ' · prueba' : ''}`,
            },
          }
        }),
      }
    }

    // ── Deletions ──
    if (root === 'deletions') {
      const deletedFarmsList = farms.filter((f: any) => f.deletedAt)
      return {
        title: `Eliminaciones programadas (${deletedFarmsList.length})`,
        rows: deletedFarmsList.map((f: any) => {
          const deletedDate = formatDate(f.deletedAt)
          const scheduledDate = formatDate(f.scheduledDeletionAt)
          const owner = userMap.get(f.ownerId)
          return {
            key: f.id,
            label: `🚜 ${f.name || '(sin nombre)'}`,
            value: `${owner?.email || f.ownerId}`,
            meta: { deletedDate, scheduledDate },
          }
        }),
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
  const cards = summaryCards()
  const activeRoot = path.length > 0 ? path[0].key : null

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
              <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
                Panel
              </Link>
              <button onClick={logout} className="text-gray-400 hover:text-gray-600">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary cards — always visible */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {cards.map((card) => {
              const isActive = activeRoot === card.key
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      goTo(0)
                    } else {
                      setPath([{ key: card.key, label: card.label, icon: card.icon }])
                    }
                  }}
                  className={`rounded-lg p-3 border text-left transition-all ${
                    isActive
                      ? `${card.bg} border-current ring-2 ring-offset-1 shadow-md ${card.text}`
                      : `${card.bg} border-transparent hover:shadow-sm hover:border-gray-200`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{card.icon}</span>
                    <div>
                      <p className="text-[10px] font-medium text-gray-500">{card.label}</p>
                      <p className={`text-lg font-bold ${card.text} leading-tight`}>{card.value}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Breadcrumbs */}
        {path.length > 1 && (
          <nav className="flex items-center gap-1 text-sm mb-4">
            {path.map((item, i) => (
              <span key={item.key} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-400">/</span>}
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

        {activeRoot === 'pricing' && <AdminPricing onTiersChange={setBillingTiers} />}

        {/* Uso / métricas */}
        {activeRoot === 'usage' &&
          (() => {
            const pct = (n: number) =>
              usage.totalUsers ? Math.round((n / usage.totalUsers) * 100) : 0
            const maxMonth = Math.max(1, ...usage.growth.monthly.map((m) => m.signups))
            const fmtDate = (d: Date | null) => (d ? formatDate(d) : '—')
            const StatTile = ({
              label,
              value,
              sub,
            }: {
              label: string
              value: string | number
              sub?: string
            }) => (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-[11px] font-medium text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
                {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
              </div>
            )
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Uso de la plataforma</h2>
                  <p className="text-xs text-gray-400 mb-3">
                    Derivado de la actividad real en datos (escrituras). No incluye logins/lecturas.{' '}
                    {usage.totalUsers} usuarios.
                  </p>
                  {/* Actividad */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatTile
                      label="Activos 7 días"
                      value={usage.activity.active7}
                      sub={`${pct(usage.activity.active7)}% del total`}
                    />
                    <StatTile
                      label="Activos 30 días"
                      value={usage.activity.active30}
                      sub={`${pct(usage.activity.active30)}% del total`}
                    />
                    <StatTile
                      label="Dormidos (>30d)"
                      value={usage.activity.dormant}
                      sub={`${pct(usage.activity.dormant)}% del total`}
                    />
                    <StatTile
                      label="Sin actividad"
                      value={usage.activity.never}
                      sub={`${pct(usage.activity.never)}% del total`}
                    />
                  </div>
                </div>

                {/* Crecimiento */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Registros por mes
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({usage.growth.last30} en últimos 30 días)
                    </span>
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-end gap-3 h-36">
                    {usage.growth.monthly.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-gray-600">{m.signups}</span>
                        <div
                          className="w-full bg-cyan-500 rounded-t transition-all"
                          style={{ height: `${(m.signups / maxMonth) * 100}%`, minHeight: 2 }}
                        />
                        <span className="text-[10px] text-gray-400">{m.month.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profundidad + Adopción */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Profundidad de uso</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <StatTile label="Animales / usuario (prom.)" value={usage.depth.avgAnimals} />
                      <StatTile label="Granjas / usuario (prom.)" value={usage.depth.avgFarms} />
                      <StatTile
                        label="Con ≥1 animal"
                        value={usage.depth.withAnimals}
                        sub={`${pct(usage.depth.withAnimals)}% del total`}
                      />
                      <StatTile
                        label="Power users (≥20)"
                        value={usage.depth.powerUsers}
                        sub={`máx ${usage.depth.maxAnimals} animales`}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Adopción de features
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <StatTile
                        label="Usan reproducciones"
                        value={`${pct(usage.adoption.breedings)}%`}
                        sub={`${usage.adoption.breedings} usuarios`}
                      />
                      <StatTile
                        label="Usan ventas"
                        value={`${pct(usage.adoption.sales)}%`}
                        sub={`${usage.adoption.sales} usuarios`}
                      />
                      <StatTile
                        label="Usan recordatorios"
                        value={`${pct(usage.adoption.reminders)}%`}
                        sub={`${usage.adoption.reminders} usuarios`}
                      />
                      <StatTile
                        label="Con colaboradores"
                        value={`${pct(usage.adoption.collaborators)}%`}
                        sub={`${usage.adoption.collaborators} usuarios`}
                      />
                    </div>
                  </div>
                </div>

                {/* Ranking por actividad reciente */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Usuarios por actividad reciente
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
                          <tr>
                            <th className="text-left font-medium px-3 py-2">Usuario</th>
                            <th className="text-right font-medium px-3 py-2">Última act.</th>
                            <th className="text-right font-medium px-3 py-2">Animales</th>
                            <th className="text-right font-medium px-3 py-2">Granjas</th>
                            <th className="text-right font-medium px-3 py-2">Repr.</th>
                            <th className="text-right font-medium px-3 py-2">Ventas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usage.rows.map((r) => (
                            <tr
                              key={r.id}
                              className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                setPath([
                                  { key: 'users', label: 'Usuarios', icon: '👥' },
                                  { key: r.id, label: r.email, icon: '👤' },
                                ])
                              }
                            >
                              <td className="px-3 py-2 text-gray-900 truncate max-w-[200px]">
                                {r.email}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                                {r.daysSinceActivity === null
                                  ? 'nunca'
                                  : r.daysSinceActivity === 0
                                    ? 'hoy'
                                    : `${r.daysSinceActivity}d`}
                                <span className="text-gray-300"> · {fmtDate(r.lastActivity)}</span>
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700">{r.animals}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{r.farms}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{r.breedings}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{r.sales}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

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
            <div className="flex items-center justify-between mb-3">
              {view.title && <h2 className="text-lg font-semibold text-gray-900">{view.title}</h2>}
              {activeRoot === 'marketing' && (
                <div className="flex items-center gap-3">
                  {isLoadingCampaigns && (
                    <span className="text-xs text-gray-400">Actualizando…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => openMarketingModal()}
                    className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    + Nueva campaña
                  </button>
                </div>
              )}
            </div>
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
                      {row.meta?.deletedDate && (
                        <span className="text-xs text-red-500">
                          Eliminada: {String(row.meta.deletedDate)} · Expira:{' '}
                          {String(row.meta.scheduledDate)}
                        </span>
                      )}
                      {row.meta?.campaignInfo && (
                        <span className="text-xs text-gray-400 truncate">
                          {String(row.meta.campaignInfo)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-600">{row.value}</span>
                      {row.meta?.deletedDate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const farm = rawData.farms?.find((f: any) => f.id === row.key)
                            if (farm) setDeleteFarm(farm)
                          }}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          Eliminar ahora
                        </button>
                      )}
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

        {/* User action buttons */}
        {view.userId &&
          (() => {
            const u = rawData.users?.find((x: any) => x.id === view.userId)
            if (!u) return null
            return (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setActionUser(u)}
                  className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Gestionar usuario
                </button>
                <button
                  onClick={() => openPlanModal(u)}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Gestionar Plan
                </button>
                <button
                  onClick={() => openMarketingModal(u)}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  type="button"
                >
                  Enviar email
                </button>
              </div>
            )
          })()}
      </div>

      {/* Modal acciones de usuario */}
      {actionUser && (
        <AdminUserActions
          user={{
            id: actionUser.id,
            email: actionUser.email,
            farmName: actionUser.farmName || '',
            roles: actionUser.roles || ['farmer'],
            createdAt: actionUser.createdAt?.toDate?.() || actionUser.createdAt || new Date(),
          }}
          onClose={() => setActionUser(null)}
        />
      )}

      {/* Modal gestion de plan */}
      {planUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gestionar Plan</h3>
            <p className="text-sm text-gray-500 mb-4">{planUser.email}</p>

            {isLoadingPlan ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {planData && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uso actual</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Granjas:</span>
                        <span className="font-medium text-gray-900">
                          {planData.actualFarmCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Colaboradores:</span>
                        <span className="font-medium text-gray-900">
                          {planData.actualCollaboratorCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-500">Animales activos:</span>
                      <span className="font-bold text-gray-900">{planData.animalCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      1 granja incluida gratis. Cada granja extra o colaborador usa 1 lugar.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tier asignado
                  </label>
                  <select
                    value={tierInput}
                    onChange={(e) => setTierInput(e.target.value as PlanTierId)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {billingTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.label} — {tier.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Tier requerido por inventario: {planData?.requiredTierId ?? 'free'}.
                  </p>
                </div>

                <div className="rounded-md bg-green-50 p-3">
                  <p className="text-sm font-medium capitalize text-green-800">{tierInput}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPlanUser(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSavingPlan}
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
                disabled={isSavingPlan || isLoadingPlan}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSavingPlan ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMarketingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Enviar email marketing</h3>
                <p className="text-sm text-gray-500">
                  {marketingUser
                    ? `Destinatario: ${marketingUser.email}`
                    : `Destinatarios: todos los usuarios (${rawData.users?.length || 0})`}
                </p>
              </div>
              <button
                onClick={closeMarketingModal}
                className="text-gray-400 hover:text-gray-600"
                type="button"
                disabled={isSendingMarketingEmail}
              >
                ✕
              </button>
            </div>

            {marketingResult ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {marketingResult}
              </div>
            ) : (
              <div className="space-y-4">
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">
                    Plantilla
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyMarketingTemplate('basic')}
                      disabled={isSendingMarketingEmail}
                      className={`min-h-14 rounded-md border px-3 py-2 text-left transition-colors ${
                        marketingTemplate === 'basic'
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Correo básico</span>
                      <span className="block text-xs text-gray-500">Aviso simple con CTA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMarketingTemplate('app_updates')}
                      disabled={isSendingMarketingEmail}
                      className={`min-h-14 rounded-md border px-3 py-2 text-left transition-colors ${
                        marketingTemplate === 'app_updates'
                          ? 'border-green-500 bg-green-50 text-green-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block text-sm font-semibold">Actualizaciones</span>
                      <span className="block text-xs text-gray-500">Lista de mejoras nuevas</span>
                    </button>
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="marketing-subject"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Asunto
                  </label>
                  <input
                    id="marketing-subject"
                    type="text"
                    maxLength={120}
                    value={marketingSubject}
                    onChange={(e) => setMarketingSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nueva mejora disponible en Mi Granja"
                    disabled={isSendingMarketingEmail}
                  />
                </div>

                <div>
                  <label
                    htmlFor="marketing-message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="marketing-message"
                    value={marketingMessage}
                    onChange={(e) => setMarketingMessage(e.target.value)}
                    rows={7}
                    maxLength={4000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder={
                      marketingTemplate === 'app_updates'
                        ? 'Escribe una intro y luego mejoras con guion, una por línea.'
                        : 'Escribe el contenido del correo. Usa saltos de línea para separar párrafos.'
                    }
                    disabled={isSendingMarketingEmail}
                  />
                  {marketingTemplate === 'app_updates' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Las líneas que empiezan con guion se mostrarán como mejoras destacadas.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="marketing-cta-text"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Texto del botón
                    </label>
                    <input
                      id="marketing-cta-text"
                      type="text"
                      value={marketingCtaText}
                      onChange={(e) => setMarketingCtaText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Abrir Mi Granja"
                      disabled={isSendingMarketingEmail}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="marketing-cta-url"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      URL del botón
                    </label>
                    <input
                      id="marketing-cta-url"
                      type="url"
                      value={marketingCtaUrl}
                      onChange={(e) => setMarketingCtaUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://dashboard.migranja.app"
                      disabled={isSendingMarketingEmail}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeMarketingModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                type="button"
                disabled={isSendingMarketingEmail}
              >
                {marketingResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!marketingResult && (
                <button
                  onClick={handleSendMarketingEmail}
                  disabled={
                    isSendingMarketingEmail || !marketingSubject.trim() || !marketingMessage.trim()
                  }
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  type="button"
                >
                  {isSendingMarketingEmail ? 'Enviando...' : 'Enviar campaña'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmacion eliminacion permanente */}
      {deleteFarm &&
        (() => {
          const deletedDate = deleteFarm.deletedAt?.toDate?.() || new Date(deleteFarm.deletedAt)
          const scheduledDate =
            deleteFarm.scheduledDeletionAt?.toDate?.() || new Date(deleteFarm.scheduledDeletionAt)
          const daysLeft = Math.max(
            0,
            Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          )
          const ownerEmail =
            rawData.users?.find((u: any) => u.id === deleteFarm.ownerId)?.email ||
            deleteFarm.ownerId

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <h3 className="text-lg font-bold text-red-800 mb-1">
                  Eliminar granja permanentemente
                </h3>
                <p className="text-sm text-gray-500 mb-4">{deleteFarm.name}</p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 mb-4">
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-500">Propietario:</span>{' '}
                      <span className="font-medium">{ownerEmail}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Eliminada:</span>{' '}
                      <span className="font-medium">{deletedDate.toISOString().slice(0, 10)}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Eliminacion programada:</span>{' '}
                      <span className="font-medium">
                        {scheduledDate.toISOString().slice(0, 10)}
                      </span>
                    </p>
                  </div>
                  {daysLeft > 0 ? (
                    <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      Faltan {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} para que se cumpla el
                      plazo
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-red-700 bg-red-100 rounded px-2 py-1">
                      El plazo ya se cumplio
                    </p>
                  )}
                </div>

                <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm text-red-800 mb-4">
                  <p className="font-medium">Esta accion es irreversible.</p>
                  <p className="text-xs mt-1">
                    Se eliminaran permanentemente: la granja, animales, reproducciones, ventas,
                    gastos, invitaciones y todos los datos asociados.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteFarm(null)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                    disabled={isDeletingFarm}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleHardDelete(deleteFarm.id)}
                    disabled={isDeletingFarm}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeletingFarm ? 'Eliminando...' : 'Eliminar permanentemente'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
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
  const [sortKey, setSortKey] = useState<string | null>(table.defaultSortKey ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(table.defaultSortDir ?? 'asc')

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
