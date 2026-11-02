'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { PiCheck, PiHourglass } from 'react-icons/pi'
import { useSelector } from 'react-redux'
import { Modal } from '@/components/Modal'
import type { RootState } from '@/features/store'
import { type OperationAction, operationActionSchema } from '@/lib/ai/operations'
import { ProposalRequestError, requestProposal } from '@/lib/ai/proposal-client'
import type { AiProposalView } from '@/lib/ai/proposal-types'
import {
  animals_genders_labels,
  animals_stages_labels,
  animals_types_labels,
} from '@/types/animals'
import OperationFields, { type OperationDraft } from './OperationFields'

const statusLabels: Record<AiProposalView['status'], string> = {
  ready: 'Por revisar',
  succeeded: 'Registrado',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  conflict: 'Datos cambiaron',
}
const fieldLabels: Record<string, string> = {
  animalNumber: 'ID',
  name: 'Nombre',
  type: 'Especie',
  gender: 'Género',
  isBreedingMale: 'Semental',
  stage: 'Etapa',
  breed: 'Raza',
  birthDate: 'Nacimiento',
  weightKg: 'Peso (kg)',
  motherRef: 'Madre',
  fatherRef: 'Padre',
  animalRef: 'Animal',
  animalRefs: 'Animales',
  maleRef: 'Macho',
  femaleRefs: 'Hembras',
  breedingDate: 'Inicio del empadre',
  date: 'Fecha',
  destination: 'Destino',
  liters: 'Litros',
  session: 'Turno',
  category: 'Tipo de atención',
  title: 'Atención',
  description: 'Descripción',
  treatment: 'Tratamiento',
  cost: 'Costo',
  pricePerKg: 'Precio por kg',
  buyer: 'Comprador',
  birthTime: 'Hora',
  breedingRef: 'Empadre',
  referenceDate: 'Fecha de referencia',
  weights: 'Pesos (kg)',
  offspring: 'Crías',
  status: 'Estado',
  notes: 'Notas',
}
const enumLabels: Record<string, string> = {
  ...animals_types_labels,
  ...animals_genders_labels,
  ...animals_stages_labels,
  engorda: 'Engorda',
  reproductor: 'Reproducción',
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
  evening: 'Noche',
  total: 'Total del día',
  deworming: 'Desparasitación',
  supplement: 'Suplemento',
  observation: 'Observación',
  activo: 'Activo',
  muerto: 'Muerto',
  medical: 'Consulta médica',
  vaccine: 'Vacuna',
  treatment: 'Tratamiento',
  surgery: 'Cirugía',
  injury: 'Lesión',
  illness: 'Enfermedad',
  reproductive: 'Reproductiva',
  nutrition: 'Nutrición',
  other: 'Otro',
}
const actionDescriptions: Record<OperationAction['type'], string> = {
  create_animal: 'Darás de alta un animal nuevo y se guardará su registro de ingreso a la granja.',
  create_breeding: 'Crearás un empadre con el macho y las hembras seleccionados.',
  confirm_pregnancy:
    'Confirmarás la gestación de las hembras seleccionadas y se calcularán sus fechas esperadas de parto.',
  finish_breeding:
    'Terminarás el empadre seleccionado y el macho quedará disponible para otra monta.',
  register_birth:
    'Registrarás el parto, se crearán las crías y se actualizarán la madre y su gestación.',
  register_weaning: 'Registrarás el destete de los animales seleccionados y su destino productivo.',
  register_weight: 'Guardarás un nuevo pesaje y se actualizará el peso del animal.',
  register_milk: 'Guardarás el ordeño con la cantidad, fecha y turno indicados.',
  register_health: 'Guardarás la atención de salud para los animales seleccionados.',
  create_sale:
    'Registrarás una venta completada y los animales seleccionados quedarán como vendidos.',
}

const safeInternalHref = (value?: string) =>
  value?.startsWith('/') && !value.startsWith('//') ? value : undefined

export function ActionSummary({ proposal }: { proposal: AiProposalView }) {
  const animals = useSelector((state: RootState) => state.animals.animals)
  const display = (key: string, value: unknown): string => {
    if (typeof value === 'string') {
      if (/Ref$|Refs$/.test(key))
        return (
          animals.find(
            (animal) =>
              animal.id === value && (!animal.farmId || animal.farmId === proposal.farmId),
          )?.animalNumber || value
        )
      if (/Date$|^date$/.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value.split('-').reverse().join('/')
      return ['type', 'gender', 'stage', 'destination', 'session', 'category', 'status'].includes(
        key,
      )
        ? enumLabels[value] || value
        : value
    }
    if (Array.isArray(value)) return value.map((item) => display(key, item)).join(', ')
    if (typeof value === 'number') return value.toLocaleString('es-MX')
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'
    return ''
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {Object.entries(proposal.action.payload)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => {
          if (key === 'offspring' && Array.isArray(value))
            return (
              <div key={key} className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Crías</dt>
                <dd className="mt-1 space-y-2">
                  {value.map((child, index) => (
                    <div key={index} className="rounded-lg bg-slate-50 p-2 text-sm text-slate-800">
                      {Object.entries(child)
                        .filter(([_, field]) => field !== undefined && field !== '')
                        .map(
                          ([name, field]) =>
                            `${fieldLabels[name] || name}: ${display(name, field)}`,
                        )
                        .join(' · ')}
                    </div>
                  ))}
                </dd>
              </div>
            )
          if (key === 'weights' && Array.isArray(value))
            return (
              <div key={key} className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Pesos por animal</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {value
                    .map(
                      (weight) =>
                        `${display('animalRef', weight.animalRef)}: ${display('weightKg', weight.weightKg)} kg`,
                    )
                    .join(' · ')}
                </dd>
              </div>
            )
          return (
            <div
              key={key}
              className={key === 'notes' || key === 'description' ? 'sm:col-span-2' : ''}
            >
              <dt className="text-xs font-medium text-slate-500">{fieldLabels[key] || key}</dt>
              <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">
                {display(key, value)}
              </dd>
            </div>
          )
        })}
    </dl>
  )
}

export default function ProposalCard({
  initialProposal,
  compact = false,
  farmId,
  conversationId,
  onChange,
  onNavigate,
}: {
  initialProposal: AiProposalView
  compact?: boolean
  farmId: string
  conversationId: string
  onChange: (proposal: AiProposalView) => void
  onNavigate: (href: string) => void
}) {
  const [proposal, setProposal] = useState(initialProposal)
  const [verified, setVerified] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [needsRevision, setNeedsRevision] = useState(false)
  const [draft, setDraft] = useState<OperationDraft>({
    ...initialProposal.action,
    payload: { ...initialProposal.action.payload },
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const callback = useRef(onChange)
  callback.current = onChange
  const formId = useId()
  const belongsHere = proposal.farmId === farmId && proposal.conversationId === conversationId
  const publish = useCallback(
    (next: AiProposalView) => {
      if (next.farmId !== farmId || next.conversationId !== conversationId)
        throw new Error('Esta acción pertenece a otra conversación o granja.')
      setProposal(next)
      setDraft({ ...next.action, payload: { ...next.action.payload } })
      setVerified(true)
      callback.current(next)
    },
    [farmId, conversationId],
  )

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const next = await requestProposal(
        { farmId, proposalId: initialProposal.id, operation: 'get' },
        signal,
      )
      if (!signal?.aborted) publish(next)
      return next
    },
    [farmId, initialProposal.id, publish],
  )

  useEffect(() => {
    const abort = new AbortController()
    setVerified(false)
    refresh(abort.signal).catch(() => {
      if (!abort.signal.aborted)
        setError('No se pudo comprobar el estado. Actualiza antes de continuar.')
    })
    return () => abort.abort()
  }, [refresh])

  const execute = async (operation: 'get' | 'revise' | 'confirm' | 'cancel') => {
    if (pending.current || !belongsHere) return
    const parsed = operation === 'revise' ? operationActionSchema.safeParse(draft) : null
    if (parsed && !parsed.success) {
      const fields = [
        ...new Set(
          parsed.error.issues.map((issue) => {
            const name = [...issue.path]
              .reverse()
              .find((part) => typeof part === 'string' && part !== 'payload')
            return fieldLabels[String(name)] || 'Datos del movimiento'
          }),
        ),
      ]
      setError(`Revisa estos campos: ${fields.join(', ')}.`)
      return
    }
    pending.current = true
    setBusy(operation)
    setError('')
    try {
      const next = await requestProposal({
        farmId,
        proposalId: proposal.id,
        revision: proposal.revision,
        operation,
        ...(parsed?.success ? { action: parsed.data } : {}),
      })
      publish(next)
      if (operation === 'revise') {
        setEditing(false)
        setNeedsRevision(false)
      }
      if (next.status === 'succeeded' || next.status === 'cancelled') setReviewOpen(false)
    } catch (reason) {
      if (
        reason instanceof ProposalRequestError &&
        reason.proposal?.farmId === farmId &&
        reason.proposal?.conversationId === conversationId
      )
        publish(reason.proposal)
      setError(reason instanceof Error ? reason.message : 'No se pudo completar esta acción.')
      if (operation === 'confirm') {
        if (reason instanceof ProposalRequestError && reason.status === 409) setNeedsRevision(true)
        setVerified(false)
        try {
          const next = await refresh()
          if (next.status === 'succeeded' && next.receipt) {
            setError('')
            setReviewOpen(false)
          } else
            setError('No se confirmó el guardado. Revisa el estado antes de volver a intentar.')
        } catch {
          setError(
            'No se pudo verificar si se guardó. Actualiza el estado; no inicies otro movimiento igual.',
          )
        }
      }
    } finally {
      pending.current = false
      setBusy(null)
    }
  }

  const close = () => {
    if (!pending.current) {
      if (editing) {
        setDraft({ ...proposal.action, payload: { ...proposal.action.payload } })
        setEditing(false)
      } else setReviewOpen(false)
      setError('')
    }
  }
  const succeeded = verified && proposal.status === 'succeeded' && !!proposal.receipt
  const canReview =
    verified && belongsHere && (proposal.status === 'ready' || proposal.status === 'conflict')
  const receiptHref = safeInternalHref(proposal.receipt?.href)
  const expired = Date.parse(proposal.expiresAt) <= Date.now()
  const isMassAction = Object.entries(proposal.action.payload).some(
    ([key, value]) =>
      ['animalRefs', 'femaleRefs', 'offspring'].includes(key) &&
      Array.isArray(value) &&
      value.length > 1,
  )

  return (
    <>
      <article
        aria-label={proposal.title}
        className={`mt-3 min-w-0 rounded-xl ${compact ? 'p-2' : 'p-3'} ring-1 ${succeeded ? 'bg-green-50 ring-green-200' : 'bg-slate-50 ring-slate-200'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900">{proposal.title}</h4>
          <div className="flex flex-col items-end gap-1">
            {canReview ? (
              <button
                type="button"
                disabled={!!busy}
                title="Revisar acción"
                onClick={() => {
                  setDraft({ ...proposal.action, payload: { ...proposal.action.payload } })
                  setEditing(false)
                  setReviewOpen(true)
                }}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:opacity-50"
              >
                {proposal.status === 'ready' && (
                  <PiHourglass aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                {statusLabels[proposal.status]}
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${succeeded ? 'bg-green-100 text-green-900' : 'bg-white text-slate-600'}`}
              >
                {succeeded && <PiCheck aria-hidden="true" className="h-3.5 w-3.5" />}
                {verified ? statusLabels[proposal.status] : 'Por comprobar'}
              </span>
            )}
            {succeeded && receiptHref && (
              <button
                type="button"
                onClick={() => onNavigate(receiptHref)}
                className="min-h-9 cursor-pointer rounded-lg px-2 text-xs font-medium text-green-800 underline underline-offset-2 hover:bg-green-100 focus-visible:ring-2 focus-visible:ring-green-700"
              >
                Ver registro
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 whitespace-normal text-sm leading-6 text-slate-600">
          {succeeded ? proposal.receipt!.message : proposal.summary}
        </p>
        {succeeded && (
          <p className="mt-1 text-xs text-slate-500">
            {new Date(proposal.receipt!.completedAt).toLocaleString('es-MX')}
          </p>
        )}
        {!reviewOpen && error && (
          <p role="alert" className="mt-2 text-xs leading-5 text-amber-800">
            {error}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {!succeeded && (!compact || !!error) && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => execute('get')}
              className="min-h-11 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 disabled:opacity-50"
            >
              {busy === 'get' ? 'Comprobando…' : 'Actualizar estado'}
            </button>
          )}
        </div>
        {verified && proposal.status === 'expired' && (
          <p className="mt-2 text-xs text-slate-500">
            Pide al asistente que prepare una nueva propuesta con los datos actuales.
          </p>
        )}
      </article>
      <Modal
        isOpen={reviewOpen}
        onClose={close}
        title="Confirmar acción"
        size="lg"
        mobileSheet
        closeOnOverlayClick={!busy}
        closeOnEscape={!busy}
        showCloseButton={!busy}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={!!busy}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {editing ? 'Volver a revisión' : 'Volver al chat'}
            </button>
            {editing ? (
              <button
                type="submit"
                form={formId}
                disabled={!!busy}
                className="min-h-12 flex-1 rounded-xl bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy === 'revise' ? 'Revisando…' : 'Revisar cambios'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => execute('confirm')}
                disabled={
                  !!busy || !verified || proposal.status !== 'ready' || needsRevision || expired
                }
                className="min-h-12 flex-1 rounded-xl bg-green-700 px-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy === 'confirm' ? 'Registrando…' : 'Confirmar y registrar'}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <section
            aria-label="Acción que vas a realizar"
            className="rounded-2xl border border-green-200 bg-green-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
              Acción que vas a realizar
            </p>
            <h3 className="mt-1 text-xl font-bold text-green-950">{proposal.title}</h3>
            <p className="mt-2 text-sm leading-6 text-green-900">
              {actionDescriptions[proposal.action.type]}
            </p>
          </section>
          <p className="text-sm leading-6 text-slate-600">
            {editing
              ? 'Ajusta los datos. Antes de registrar verás la propuesta revisada.'
              : 'Comprueba los animales, las fechas y los datos antes de confirmar.'}
          </p>
          {isMassAction && (
            <p role="note" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
              Este movimiento en masa afecta a varios animales. Confirma con cuidado: revisa cada
              animal, fecha, cantidad e importe antes de registrar.
            </p>
          )}
          {editing ? (
            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault()
                execute('revise')
              }}
            >
              <OperationFields
                draft={draft}
                onChange={setDraft}
                disabled={!!busy}
                farmId={farmId}
              />
            </form>
          ) : (
            <ActionSummary proposal={proposal} />
          )}
          {!editing && proposal.effects.length > 0 && (
            <section className="rounded-xl bg-green-50 p-3">
              <h4 className="text-sm font-semibold text-green-950">Cambios al confirmar</h4>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-green-900">
                {proposal.effects.map((effect, index) => (
                  <li key={index}>• {effect}</li>
                ))}
              </ul>
            </section>
          )}
          {(proposal.status === 'conflict' || needsRevision || expired) && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"
            >
              {expired
                ? 'Esta propuesta venció. Pide una nueva al asistente para revisar los datos actuales.'
                : 'Los datos cambiaron desde que se preparó la propuesta. Revisa y actualiza los datos antes de confirmar.'}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
              {error}
            </p>
          )}
          {!editing && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!busy || expired}
                onClick={() => {
                  setDraft({ ...proposal.action, payload: { ...proposal.action.payload } })
                  setEditing(true)
                  setError('')
                }}
                className="min-h-11 rounded-lg px-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                Editar datos
              </button>
              <button
                type="button"
                disabled={!!busy || proposal.status !== 'ready'}
                onClick={() => execute('cancel')}
                className="min-h-11 rounded-lg px-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar propuesta
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
