'use client'

import React, { useState } from 'react'
import { useBackup } from '@/hooks/useBackup'
import ModalRestoreBackup from './ModalRestoreBackup'

const BackupSection: React.FC = () => {
  const { exportBackup, isExporting, progress } = useBackup()
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

      <ModalRestoreBackup
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </div>
  )
}

export default BackupSection
