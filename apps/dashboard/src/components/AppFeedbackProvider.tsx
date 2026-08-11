'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type FeedbackKind = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  message: string
  kind: FeedbackKind
}

interface ConfirmationOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PendingConfirmation extends ConfirmationOptions {
  resolve: (confirmed: boolean) => void
}

interface AppFeedbackContextValue {
  notify: (message: string, kind?: FeedbackKind) => void
  confirmAction: (options: ConfirmationOptions | string) => Promise<boolean>
}

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null)

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const nextToastId = useRef(0)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)

  const notify = useCallback((message: string, kind: FeedbackKind = 'error') => {
    const id = ++nextToastId.current
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4500)
  }, [])

  const confirmAction = useCallback((options: ConfirmationOptions | string) => {
    const normalized = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setConfirmation({ ...normalized, resolve })
    })
  }, [])

  const finishConfirmation = useCallback((confirmed: boolean) => {
    setConfirmation((current) => {
      current?.resolve(confirmed)
      return null
    })
  }, [])

  const value = useMemo(() => ({ notify, confirmAction }), [confirmAction, notify])

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[10000] flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-sm shadow-xl ${
              toast.kind === 'error'
                ? 'border-red-200 text-red-900'
                : toast.kind === 'success'
                  ? 'border-green-200 text-green-900'
                  : 'border-blue-200 text-blue-900'
            }`}
          >
            <span className="mt-0.5 text-base" aria-hidden="true">
              {toast.kind === 'error' ? '!' : toast.kind === 'success' ? '✓' : 'i'}
            </span>
            <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded-lg px-2 py-0.5 text-lg leading-none text-gray-500 hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {confirmation && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) finishConfirmation(false)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-confirmation-title"
            aria-describedby="app-confirmation-message"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="app-confirmation-title" className="text-xl font-semibold text-slate-900">
              {confirmation.title ?? 'Confirmar acción'}
            </h2>
            <p id="app-confirmation-message" className="mt-3 text-sm leading-6 text-slate-600">
              {confirmation.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => finishConfirmation(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {confirmation.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => finishConfirmation(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                  confirmation.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-700 hover:bg-green-800'
                }`}
              >
                {confirmation.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppFeedbackContext.Provider>
  )
}

export function useAppFeedback(): AppFeedbackContextValue {
  const context = useContext(AppFeedbackContext)
  if (!context) throw new Error('useAppFeedback debe usarse dentro de AppFeedbackProvider')
  return context
}
