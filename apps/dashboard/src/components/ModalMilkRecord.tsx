'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { type FormEvent, useMemo, useState } from 'react'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { toDate } from '@/lib/dates'
import { type Animal, isMilkRecord, type MilkingSession } from '@/types/animals'
import Button from './buttons/Button'
import { Modal } from './Modal'

const SESSION_OPTIONS: { value: MilkingSession; label: string; icon: string }[] = [
  { value: 'morning', label: 'Mañana', icon: '🌅' },
  { value: 'afternoon', label: 'Tarde', icon: '☀️' },
  { value: 'evening', label: 'Noche', icon: '🌙' },
]

const PURPOSE_LABELS = {
  offspring: 'Para sus crías',
  dairy: 'Producción de leche',
  dual: 'Crías y producción de leche',
} as const

const liters = (amountMl: number) => `${(amountMl / 1000).toLocaleString('es-MX')} L`

export default function ModalMilkRecord({ animal }: { animal: Animal }) {
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amount, setAmount] = useState('')
  const [session, setSession] = useState<MilkingSession>('morning')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDry, setConfirmDry] = useState(false)
  const { addMilkEntry, endLactation } = useAnimalCRUD()

  const sortedRecords = useMemo(
    () =>
      (animal.records || [])
        .filter(isMilkRecord)
        .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()),
    [animal.records],
  )
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todayTotal = sortedRecords
    .filter((entry) => format(toDate(entry.date), 'yyyy-MM-dd') === todayKey)
    .reduce((total, entry) => total + entry.amountMl, 0)

  const reset = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setAmount('')
    setSession('morning')
    setNotes('')
    setError('')
    setConfirmDry(false)
  }

  const finishLactation = async () => {
    setError('')
    setIsSaving(true)
    try {
      await endLactation(animal.id)
      setIsOpen(false)
      reset()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'No se pudo finalizar la lactancia.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const close = () => {
    if (isSaving) return
    setIsOpen(false)
    reset()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const amountLiters = Number(amount.replace(',', '.'))
    if (!Number.isFinite(amountLiters) || amountLiters <= 0) {
      setError('Escribe una cantidad de leche mayor que cero.')
      return
    }
    if (amountLiters > 200) {
      setError('La cantidad por registro no puede superar 200 litros.')
      return
    }

    const dateParts = date.split('-').map(Number)
    if (dateParts.length !== 3 || dateParts.some((part) => !Number.isInteger(part))) {
      setError('Selecciona una fecha válida.')
      return
    }
    const [year, month, day] = dateParts as [number, number, number]
    const milkedAt = new Date(year, month - 1, day, 12, 0, 0, 0)
    if (
      Number.isNaN(milkedAt.getTime()) ||
      milkedAt.getFullYear() !== year ||
      milkedAt.getMonth() !== month - 1 ||
      milkedAt.getDate() !== day
    ) {
      setError('Selecciona una fecha válida.')
      return
    }

    // La fecha del ordeño representa un día, no una hora. Para hoy usamos la
    // hora actual y evitamos que el mediodía se interprete como una fecha futura.
    const now = new Date()
    if (date === format(now, 'yyyy-MM-dd')) {
      milkedAt.setTime(now.getTime())
    }

    setIsSaving(true)
    try {
      await addMilkEntry(animal.id, {
        date: milkedAt,
        amountMl: Math.round(amountLiters * 1000),
        session,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      setIsOpen(false)
      reset()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo guardar el registro de leche.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        color="info"
        className="min-h-11"
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen(true)
        }}
      >
        🥛 Leche
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Registrar leche"
        size="lg"
        icon="babyBottle"
        iconClassName="text-cyan-700"
        closeOnOverlayClick={!isSaving}
        closeOnEscape={!isSaving}
      >
        <form onSubmit={submit} className="space-y-5">
          <section className="grid gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-semibold text-gray-900">
                #{animal.animalNumber}
                {animal.name ? ` · ${animal.name}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {PURPOSE_LABELS[animal.lactationPurpose ?? 'dairy']}
              </p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 text-left shadow-sm sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Hoy</p>
              <p className="text-xl font-bold text-cyan-800">{liters(todayTotal)}</p>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-gray-800">
              Fecha del ordeño
              <input
                type="date"
                value={date}
                max={todayKey}
                onChange={(event) => setDate(event.target.value)}
                required
                disabled={isSaving}
                className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-gray-800">
              Cantidad (litros)
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ej. 8.5"
                autoFocus
                required
                disabled={isSaving}
                className="min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">Turno o resumen</legend>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_OPTIONS.map((option) => {
                const selected = session === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSession(option.value)}
                    disabled={isSaving}
                    className={`min-h-12 rounded-xl border px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${
                      selected
                        ? 'border-cyan-700 bg-cyan-50 text-cyan-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span aria-hidden="true">{option.icon}</span> {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="grid gap-1.5 text-sm font-semibold text-gray-800">
            Notas <span className="font-normal text-gray-500">(opcional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              maxLength={300}
              disabled={isSaving}
              placeholder="Calidad, incidencia o destino de la leche…"
              className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          {sortedRecords.length > 0 ? (
            <section aria-labelledby="recent-milk-title">
              <h3 id="recent-milk-title" className="mb-2 text-sm font-semibold text-gray-800">
                Registros recientes
              </h3>
              <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
                {sortedRecords.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span className="text-gray-600">
                      {format(toDate(entry.date), "d 'de' MMMM", { locale: es })} ·{' '}
                      {SESSION_OPTIONS.find((option) => option.value === entry.session)?.label ??
                        entry.session}
                    </span>
                    <strong className="shrink-0 text-gray-900">{liters(entry.amountMl)}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className={`min-w-0 rounded-xl border p-3 ${
              confirmDry ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {!confirmDry ? (
              <button
                type="button"
                onClick={() => setConfirmDry(true)}
                disabled={isSaving}
                className="min-h-11 text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline"
              >
                Finalizar lactancia
              </button>
            ) : (
              <div className="min-w-0 space-y-3 overflow-hidden" aria-live="polite">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">¿Finalizar lactancia?</p>
                  <p className="mt-1 max-w-full whitespace-normal break-words text-sm leading-relaxed text-gray-700">
                    Ya no aparecerá en Madre/Lechera. Los registros se conservarán.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    onClick={() => setConfirmDry(false)}
                    disabled={isSaving}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    No, volver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    color="warning"
                    onClick={() => void finishLactation()}
                    disabled={isSaving}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    Sí, finalizar
                  </Button>
                </div>
              </div>
            )}
          </section>

          <div className="sticky bottom-0 grid gap-2 border-t border-gray-200 bg-white pt-3 sm:grid-cols-[auto_1fr]">
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              onClick={close}
              disabled={isSaving}
              className="min-h-12"
            >
              Cancelar
            </Button>
            <Button type="submit" color="info" disabled={isSaving} className="min-h-12">
              {isSaving ? 'Guardando…' : 'Guardar registro de leche'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
