'use client'

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { type FormEvent, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '@/features/auth/authSlice'
import type { RootState } from '@/features/store'
import { db } from '@/lib/firebase'
import { Modal } from './Modal'

export default function PersonalDetails() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  if (!user) return null

  const close = () => {
    if (!pending.current) setOpen(false)
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending.current) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Escribe tu nombre.')
      return
    }
    pending.current = true
    setSaving(true)
    setError('')
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: trimmedName,
        updatedAt: serverTimestamp(),
      })
      dispatch(setUser({ ...user, name: trimmedName }))
      setOpen(false)
      setSaved(true)
    } catch {
      setError('No se pudieron guardar tus datos. Inténtalo de nuevo.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Datos personales</h3>
          <button
            type="button"
            onClick={() => {
              setName(user.name || '')
              setError('')
              setSaved(false)
              setOpen(true)
            }}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
          >
            Editar datos personales
          </button>
        </div>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Nombre</dt>
            <dd className="break-words text-gray-900">{user.name || 'Sin nombre'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Correo electrónico</dt>
            <dd className="break-all text-gray-900">{user.email}</dd>
          </div>
        </dl>
        {saved && (
          <p role="status" className="mt-4 text-sm text-green-700">
            Datos guardados.
          </p>
        )}
      </section>
      <Modal
        isOpen={open}
        onClose={close}
        title="Editar datos personales"
        size="md"
        mobileSheet
        closeOnEscape={!saving}
        closeOnOverlayClick={!saving}
        showCloseButton={!saving}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="personal-details-form"
              disabled={saving}
              className="min-h-12 flex-1 rounded-xl bg-green-700 px-4 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        }
      >
        <form id="personal-details-form" onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="personal-name" className="block text-sm font-semibold text-slate-700">
              Nombre *
            </label>
            <input
              id="personal-name"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              required
              disabled={saving}
              aria-invalid={!!error}
              aria-describedby={error ? 'personal-details-error' : undefined}
              className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-700 disabled:opacity-50"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Correo electrónico</p>
            <p className="break-all text-slate-600">{user.email}</p>
            <p className="mt-1 text-xs text-slate-500">
              Este correo se utiliza para iniciar sesión.
            </p>
          </div>
          {error && (
            <p id="personal-details-error" role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </>
  )
}
