'use client'

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/features/store'
import { useBackup } from '@/hooks/useBackup'
import ModalRestoreBackup from './ModalRestoreBackup'

function formatDate(dateValue: unknown): string {
  if (!dateValue) return '—'
  // Firestore Timestamp serializado
  if (typeof dateValue === 'object' && dateValue !== null) {
    const ts = dateValue as { seconds?: number; _seconds?: number }
    const seconds = ts.seconds ?? ts._seconds
    if (seconds) {
      return new Date(seconds * 1000).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }
  // ISO string
  if (typeof dateValue === 'string') {
    const d = new Date(dateValue)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }
  return '—'
}

function formatCounts(counts: Record<string, number>): string {
  const parts: string[] = []
  if (counts.animals) parts.push(`${counts.animals} animales`)
  if (counts.breedingRecords) parts.push(`${counts.breedingRecords} reproductivos`)
  if (counts.reminders) parts.push(`${counts.reminders} recordatorios`)
  if (counts.weightRecords) parts.push(`${counts.weightRecords} pesos`)
  if (counts.farmInvitations) parts.push(`${counts.farmInvitations} invitaciones`)
  if (counts.sales) parts.push(`${counts.sales} ventas`)
  return parts.join(', ') || 'Sin datos'
}

interface BackupHistoryEntry {
  type: 'export' | 'restore'
  date: unknown
  detail: string
  subDetail?: string
}

const BackupSection: React.FC = () => {
  const { exportBackup, isExporting, progress } = useBackup()
  const { currentFarm } = useSelector((state: RootState) => state.farm)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    setExportError(null)
    try {
      await exportBackup()
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Error al exportar')
    }
  }

  // Construir historial combinado
  const history: BackupHistoryEntry[] = []

  if (currentFarm?.exportedBackups) {
    for (const exp of currentFarm.exportedBackups) {
      history.push({
        type: 'export',
        date: exp.createdAt,
        detail: exp.fileName,
        subDetail: exp.counts ? formatCounts(exp.counts) : undefined,
      })
    }
  }

  if (currentFarm?.restoredBackups) {
    for (const res of currentFarm.restoredBackups) {
      history.push({
        type: 'restore',
        date: res.createdAt,
        detail: `Desde: ${res.farmName}`,
        subDetail: res.backupDate ? `Respaldo del ${formatDate(res.backupDate)}` : undefined,
      })
    }
  }

  // Ordenar por fecha descendente
  history.sort((a, b) => {
    function getTimestamp(d: unknown): number {
      if (!d) return 0
      if (typeof d === 'object' && d !== null) {
        const ts = d as { seconds?: number; _seconds?: number }
        return ts.seconds ?? ts._seconds ?? 0
      }
      if (typeof d === 'string') return new Date(d).getTime() / 1000
      return 0
    }
    return getTimestamp(b.date) - getTimestamp(a.date)
  })

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Funcionalidad en prueba</p>
          <p className="text-sm text-amber-800 mt-1">
            La restauración de respaldos es una función experimental. Úsala con precaución. Te
            recomendamos descargar un respaldo de tus datos actuales antes de importar cualquier
            archivo. Los cambios realizados por una restauración no se pueden deshacer.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Respaldo y Restauración</h3>
        <p className="text-sm text-gray-600 mb-6">
          Descarga un respaldo completo de los datos de tu granja o restaura desde un archivo
          previamente exportado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tarjeta Exportar */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">💾</span>
              <div>
                <h4 className="font-medium text-gray-900">Exportar Respaldo</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Descarga todos los datos de tu granja en un archivo JSON: animales, registros
                  reproductivos, recordatorios, registros de peso e invitaciones.
                </p>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg text-white transition-colors ${
                isExporting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  {progress.message || 'Exportando...'}
                </span>
              ) : (
                'Descargar Respaldo'
              )}
            </button>

            {exportError && <p className="text-sm text-red-600">{exportError}</p>}
          </div>

          {/* Tarjeta Restaurar */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">📥</span>
              <div>
                <h4 className="font-medium text-gray-900">Restaurar Respaldo</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Importa datos desde un archivo de respaldo. Puedes combinar con los datos
                  existentes o reemplazarlos completamente.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsRestoreModalOpen(true)}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Seleccionar Archivo
            </button>
          </div>
        </div>
      </div>

      {/* Historial de Respaldos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Historial de Respaldos</h3>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-sm text-gray-500">
              Aún no hay registros de respaldos. Cuando exportes o restaures un respaldo, aparecerá
              aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm flex-shrink-0 ${
                    entry.type === 'export'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  {entry.type === 'export' ? '💾' : '📥'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entry.type === 'export'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {entry.type === 'export' ? 'Exportación' : 'Restauración'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 truncate">{entry.detail}</p>
                  {entry.subDetail && (
                    <p className="text-xs text-gray-500 mt-0.5">{entry.subDetail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalRestoreBackup
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </div>
  )
}

export default BackupSection
