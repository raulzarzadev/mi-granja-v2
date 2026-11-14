'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppFeedback } from '@/components/AppFeedbackProvider'
import InputIconSelect from '@/components/inputs/InputIconSelect'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Modal } from '@/components/Modal'
import { auth } from '@/lib/firebase'
import type { PlanTier, PlanTierId } from '@/types/billing'

interface UserPlanData {
  tierId: PlanTierId
  animalCount: number
  requiredTierId: PlanTierId
  actualFarmCount: number
  actualCollaboratorCount: number
}

const formatPrice = (price: number | null) =>
  price === null
    ? 'Precio a convenir'
    : price === 0
      ? 'Gratis'
      : `$${price.toLocaleString('es-MX')} USD/mes`

export default function AdminUserPlanModal({
  userId,
  email,
  onClose,
  onSaved,
}: {
  userId: string
  email: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { notify } = useAppFeedback()
  const [data, setData] = useState<UserPlanData | null>(null)
  const [tiers, setTiers] = useState<PlanTier[]>([])
  const [selected, setSelected] = useState<PlanTierId | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const saveLock = useRef(false)
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setLoadError('')
    setSaveError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const options = {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as const,
        signal: request.signal,
      }
      const [usageResponse, configResponse] = await Promise.all([
        fetch(`/api/admin/billing?${new URLSearchParams({ userId })}`, options),
        fetch('/api/admin/billing-config', options),
      ])
      if (!usageResponse.ok || !configResponse.ok)
        throw new Error('No se pudo cargar el plan y los precios configurados')
      const [usage, config]: [UserPlanData, { tiers: PlanTier[] }] = await Promise.all([
        usageResponse.json(),
        configResponse.json(),
      ])
      if (!config.tiers?.length || !config.tiers.some((tier) => tier.id === usage.tierId))
        throw new Error('La configuración de planes no está disponible')
      if (request.signal.aborted) return
      setData(usage)
      setTiers(config.tiers)
      setSelected(usage.tierId)
    } catch (error) {
      if (!request.signal.aborted)
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el plan')
    } finally {
      if (!request.signal.aborted) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
    return () => controller.current?.abort()
  }, [load])

  const save = async () => {
    if (saveLock.current || loading || loadError || !tiers.some((tier) => tier.id === selected))
      return
    saveLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error('La sesión de administrador no está disponible')
      const response = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, tierId: selected }),
      })
      if (!response.ok) throw new Error('No se pudo guardar el plan. Inténtalo de nuevo.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el plan')
      saveLock.current = false
      setSaving(false)
      return
    }
    notify('Plan actualizado correctamente', 'success')
    onClose()
    await onSaved().catch(() => notify('Plan guardado. Actualiza la lista para ver los cambios.'))
  }

  const tier = tiers.find((tier) => tier.id === selected)
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saveLock.current) onClose()
      }}
      title="Gestionar plan"
      mobileSheet
      closeOnEscape={!saving}
      closeOnOverlayClick={!saving}
      showCloseButton={!saving}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 cursor-pointer rounded-lg border border-gray-300 px-4 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading || !!loadError || !tier}
            className="min-h-11 cursor-pointer rounded-lg bg-green-600 px-4 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <p className="mb-4 break-all text-sm text-gray-500">{email}</p>
      {loading ? (
        <div role="status" aria-label="Cargando plan" className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 cursor-pointer underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        data && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <p className="font-medium text-gray-700">Uso actual</p>
              <dl className="space-y-2 text-gray-600">
                <div className="flex justify-between gap-3">
                  <dt>Granjas</dt>
                  <dd>{data.actualFarmCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Colaboradores</dt>
                  <dd>{data.actualCollaboratorCount}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2">
                  <dt>Animales activos</dt>
                  <dd className="font-bold text-gray-900">{data.animalCount}</dd>
                </div>
              </dl>
              <p className="text-gray-500">
                Plan requerido por inventario:{' '}
                {tiers.find((tier) => tier.id === data.requiredTierId)?.label ??
                  data.requiredTierId}
                .
              </p>
              <p className="text-gray-500">Granjas y colaboradores no agregan cargos.</p>
            </div>
            <div>
              <label
                htmlFor="admin-plan-tier"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Plan asignado
              </label>
              <InputIconSelect
                id="admin-plan-tier"
                value={selected}
                onChange={setSelected}
                disabled={saving}
                options={tiers.map((tier) => ({
                  value: tier.id,
                  label: `${tier.label} — ${formatPrice(tier.priceUsd)}${tier.isVisible === false ? ' (oculto)' : ''}`,
                  description: tier.description,
                }))}
              />
            </div>
            {tier && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <p className="font-semibold">
                  {tier.label} · {formatPrice(tier.priceUsd)}
                </p>
                <p>{tier.description}</p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              La asignación manual no genera cobros en Stripe. Una sincronización posterior de una
              suscripción pagada puede actualizar el plan.
            </p>
          </div>
        )
      )}
      {saveError && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {saveError}
        </p>
      )}
    </Modal>
  )
}
