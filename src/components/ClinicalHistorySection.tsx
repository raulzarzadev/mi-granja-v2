'use client'

import React, { useState } from 'react'
import {
  Animal,
  ClinicalEntry,
  clinical_types_labels,
  clinical_severities_labels,
  clinical_severities_colors,
  clinical_types_icons
} from '@/types/animals'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ClinicalHistorySectionProps {
  animal: Animal
}

/**
 * Componente para gestionar el historial clínico de un animal
 * Permite agregar, resolver y gestionar entradas clínicas
 */
const ClinicalHistorySection: React.FC<ClinicalHistorySectionProps> = ({
  animal
}) => {
  const { user } = useSelector((state: RootState) => state.auth)
  const {
    addClinicalEntry,
    resolveClinicalEntry,
    reopenClinicalEntry,
    removeClinicalEntry
  } = useAnimalCRUD()

  const [showForm, setShowForm] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'illness' as ClinicalEntry['type'],
    title: '',
    description: '',
    severity: 'medium' as ClinicalEntry['severity'],
    startDate: new Date().toISOString().split('T')[0],
    treatment: '',
    veterinarian: '',
    cost: '',
    notes: ''
  })

  const clinicalHistory = animal.clinicalHistory || []
  const activeCases = clinicalHistory.filter((entry) => !entry.isResolved)
  const resolvedCases = clinicalHistory.filter((entry) => entry.isResolved)

  // Ordenar por fecha (más recientes primero)
  const sortedActive = [...activeCases].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )
  const sortedResolved = [...resolvedCases].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim() || isSubmitting)
      return

    setIsSubmitting(true)
    try {
      // Preparar datos limpiando campos vacíos
      const cleanData: any = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        severity: formData.severity,
        startDate: new Date(formData.startDate)
      }

      // Solo agregar campos opcionales si tienen valor
      if (formData.treatment.trim()) {
        cleanData.treatment = formData.treatment.trim()
      }
      if (formData.veterinarian.trim()) {
        cleanData.veterinarian = formData.veterinarian.trim()
      }
      if (formData.cost && parseFloat(formData.cost) > 0) {
        cleanData.cost = parseFloat(formData.cost)
      }
      if (formData.notes.trim()) {
        cleanData.notes = formData.notes.trim()
      }

      await addClinicalEntry(animal.id, cleanData)

      // Reset form
      setFormData({
        type: 'illness',
        title: '',
        description: '',
        severity: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        treatment: '',
        veterinarian: '',
        cost: '',
        notes: ''
      })
      setShowForm(false)
    } catch (error) {
      console.error('Error agregando entrada clínica:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResolve = async (entryId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await resolveClinicalEntry(animal.id, entryId)
    } catch (error) {
      console.error('Error resolviendo entrada clínica:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopen = async (entryId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await reopenClinicalEntry(animal.id, entryId)
    } catch (error) {
      console.error('Error reabriendo entrada clínica:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    if (isSubmitting) return

    const confirmed = window.confirm(
      '¿Estás seguro de que quieres eliminar esta entrada del historial clínico?'
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await removeClinicalEntry(animal.id, entryId)
    } catch (error) {
      console.error('Error eliminando entrada clínica:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ClinicalEntryCard: React.FC<{ entry: ClinicalEntry }> = ({ entry }) => (
    <div
      className={`border rounded-lg p-3 ${
        entry.isResolved
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{clinical_types_icons[entry.type]}</span>
          <div>
            <h4
              className={`font-medium ${
                entry.isResolved ? 'text-gray-600' : 'text-gray-900'
              }`}
            >
              {entry.title}
            </h4>
            <p className="text-xs text-gray-500">
              {clinical_types_labels[entry.type]} •{' '}
              {format(new Date(entry.startDate), "dd 'de' MMMM 'de' yyyy", {
                locale: es
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              clinical_severities_colors[entry.severity]
            }`}
          >
            {clinical_severities_labels[entry.severity]}
          </span>
          {entry.isResolved && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Resuelto
            </span>
          )}
        </div>
      </div>

      <p
        className={`text-sm mb-3 ${
          entry.isResolved ? 'text-gray-600' : 'text-gray-800'
        }`}
      >
        {entry.description}
      </p>

      {(entry.treatment || entry.veterinarian || entry.cost) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
          {entry.treatment && (
            <div>
              <span className="font-medium text-gray-500">Tratamiento:</span>
              <p
                className={entry.isResolved ? 'text-gray-600' : 'text-gray-800'}
              >
                {entry.treatment}
              </p>
            </div>
          )}
          {entry.veterinarian && (
            <div>
              <span className="font-medium text-gray-500">Veterinario:</span>
              <p
                className={entry.isResolved ? 'text-gray-600' : 'text-gray-800'}
              >
                {entry.veterinarian}
              </p>
            </div>
          )}
          {entry.cost && (
            <div>
              <span className="font-medium text-gray-500">Costo:</span>
              <p
                className={entry.isResolved ? 'text-gray-600' : 'text-gray-800'}
              >
                ${entry.cost}
              </p>
            </div>
          )}
        </div>
      )}

      {entry.notes && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500">Notas:</span>
          <p
            className={`text-xs ${
              entry.isResolved ? 'text-gray-600' : 'text-gray-800'
            }`}
          >
            {entry.notes}
          </p>
        </div>
      )}

      {entry.resolvedDate && (
        <p className="text-xs text-gray-500 mb-3">
          Resuelto el{' '}
          {format(new Date(entry.resolvedDate), "dd 'de' MMMM 'de' yyyy", {
            locale: es
          })}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {entry.createdBy === user?.id && (
          <button
            onClick={() => handleDelete(entry.id)}
            disabled={isSubmitting}
            className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400"
          >
            Eliminar
          </button>
        )}
        {entry.isResolved ? (
          <button
            onClick={() => handleReopen(entry.id)}
            disabled={isSubmitting}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Reactivar
          </button>
        ) : (
          <button
            onClick={() => handleResolve(entry.id)}
            disabled={isSubmitting}
            className="text-xs text-green-600 hover:text-green-800 disabled:text-gray-400"
          >
            Marcar como resuelto
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4 pb-16">
      {/* Header y botón agregar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Historial Clínico
          </h3>
          <p className="text-sm text-gray-600">
            {activeCases.length} casos activos • {resolvedCases.length}{' '}
            resueltos
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {showForm ? 'Cancelar' : 'Agregar Entrada'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-lg p-3 space-y-3"
        >
          {/* Información básica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as ClinicalEntry['type']
                  }))
                }
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.entries(clinical_types_labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Severidad *
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    severity: e.target.value as ClinicalEntry['severity']
                  }))
                }
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.entries(clinical_severities_labels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ej: Cojera pata trasera derecha"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              placeholder="Describe los síntomas, diagnóstico, etc."
              rows={2}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value
                  }))
                }
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Veterinario
              </label>
              <input
                type="text"
                value={formData.veterinarian}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    veterinarian: e.target.value
                  }))
                }
                placeholder="Nombre del veterinario"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Costo
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0.00"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tratamiento
            </label>
            <textarea
              value={formData.treatment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, treatment: e.target.value }))
              }
              placeholder="Describe el tratamiento aplicado o recomendado"
              rows={2}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notas adicionales
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Cualquier información adicional relevante"
              rows={2}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                !formData.title.trim() ||
                !formData.description.trim() ||
                isSubmitting
              }
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 order-1 sm:order-2"
            >
              {isSubmitting ? 'Guardando...' : 'Agregar Entrada'}
            </button>
          </div>
        </form>
      )}

      {/* Casos activos */}
      {sortedActive.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Casos Activos
          </h4>
          <div className="space-y-3">
            {sortedActive.map((entry) => (
              <ClinicalEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Casos resueltos */}
      {sortedResolved.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">
              Casos Resueltos ({sortedResolved.length})
            </h4>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showResolved ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {showResolved && (
            <div className="space-y-3">
              {sortedResolved.map((entry) => (
                <ClinicalEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {clinicalHistory.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">🏥</span>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Sin historial clínico
          </h4>
          <p className="text-gray-600 mb-4">
            Este animal no tiene entradas en su historial clínico
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Agregar primera entrada
          </button>
        </div>
      )}
    </div>
  )
}

export default ClinicalHistorySection
