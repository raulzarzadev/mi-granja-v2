'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useBackup, BackupProgress, RestoreResult } from '@/hooks/useBackup'
import { BackupFile, BackupMeta, ValidationResult } from '@/lib/backup-serialization'
import { Modal } from './Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'upload' | 'preview' | 'mode' | 'progress' | 'result'

const ModalRestoreBackup: React.FC<Props> = ({ isOpen, onClose }) => {
  const { parseBackupFile, restoreBackup, isRestoring, progress } = useBackup()

  const [step, setStep] = useState<Step>('upload')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [backupData, setBackupData] = useState<BackupFile | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [result, setResult] = useState<RestoreResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setValidation(null)
    setBackupData(null)
    setMode('merge')
    setReplaceConfirmed(false)
    setResult(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = () => {
    if (isRestoring) return // No cerrar durante restauración
    reset()
    onClose()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    if (!file.name.endsWith('.json')) {
      setFileError('Solo se aceptan archivos .json')
      return
    }

    // Límite de 50MB
    if (file.size > 50 * 1024 * 1024) {
      setFileError('El archivo es demasiado grande (máximo 50MB)')
      return
    }

    try {
      const result = await parseBackupFile(file)
      setValidation(result)

      if (result.valid) {
        const text = await file.text()
        setBackupData(JSON.parse(text))
        setStep('preview')
      }
    } catch {
      setFileError('Error al procesar el archivo')
    }
  }

  const handleRestore = async () => {
    if (!backupData) return

    setStep('progress')
    const restoreResult = await restoreBackup(backupData, mode)
    setResult(restoreResult)
    setStep('result')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Restaurar Respaldo"
      size="lg"
      closeOnOverlayClick={!isRestoring}
      closeOnEscape={!isRestoring}
    >
      <div className="space-y-6">
        {/* Indicador de pasos */}
        <StepIndicator currentStep={step} />

        {/* Paso 1: Subir archivo */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona un archivo de respaldo (.json) previamente exportado desde Mi Granja.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-input"
              />
              <label
                htmlFor="backup-file-input"
                className="cursor-pointer inline-flex flex-col items-center gap-2"
              >
                <span className="text-4xl">📁</span>
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Seleccionar archivo .json
                </span>
                <span className="text-xs text-gray-500">Máximo 50MB</span>
              </label>
            </div>

            {fileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{fileError}</p>
              </div>
            )}

            {validation && !validation.valid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-800">Archivo inválido:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Preview */}
        {step === 'preview' && validation?.preview && (
          <div className="space-y-4">
            <PreviewTable meta={validation.preview} />

            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-yellow-800">Advertencias:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Volver
              </button>
              <button
                onClick={() => setStep('mode')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Elegir modo */}
        {step === 'mode' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Elige cómo importar los datos del respaldo:
            </p>

            <div className="space-y-3">
              <label
                className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
                  mode === 'merge'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="restore-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => {
                    setMode('merge')
                    setReplaceConfirmed(false)
                  }}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🔀</span>
                  <div>
                    <p className="font-medium text-gray-900">Combinar</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Los datos del respaldo se agregan a los existentes. Si un documento ya existe,
                      se actualizan sus campos sin borrar datos que no estén en el respaldo.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
                  mode === 'replace'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="restore-mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🔄</span>
                  <div>
                    <p className="font-medium text-gray-900">Reemplazar</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Se borran todos los datos existentes y se reemplazan con los del respaldo.
                      La granja nunca se borra (solo se actualizan sus campos).
                      Las invitaciones no se afectan.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {mode === 'replace' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceConfirmed}
                    onChange={(e) => setReplaceConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-red-800">
                    Entiendo que esta acción borrará todos los datos existentes de animales,
                    registros reproductivos, recordatorios y registros de peso de esta granja.
                    Esta acción no se puede deshacer.
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Volver
              </button>
              <button
                onClick={handleRestore}
                disabled={mode === 'replace' && !replaceConfirmed}
                className={`px-4 py-2 text-sm rounded-lg text-white ${
                  mode === 'replace' && !replaceConfirmed
                    ? 'bg-gray-400 cursor-not-allowed'
                    : mode === 'replace'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {mode === 'merge' ? 'Combinar datos' : 'Reemplazar datos'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Progreso */}
        {step === 'progress' && (
          <ProgressView progress={progress} />
        )}

        {/* Paso 5: Resultado */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {result.success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <span className="text-4xl block mb-2">✅</span>
                <p className="text-lg font-medium text-green-800">Restauración completada</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <span className="text-4xl block mb-2">⚠️</span>
                <p className="text-lg font-medium text-yellow-800">
                  Restauración completada con errores
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Documentos escritos:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.counts).map(([col, count]) => (
                  <div key={col} className="flex justify-between">
                    <span className="text-gray-600">{COLLECTION_LABELS[col] || col}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-800">Errores:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// --- Sub-componentes ---

const STEP_LABELS: Record<Step, string> = {
  upload: 'Archivo',
  preview: 'Vista previa',
  mode: 'Modo',
  progress: 'Progreso',
  result: 'Resultado',
}

const STEPS: Step[] = ['upload', 'preview', 'mode', 'progress', 'result']

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIdx = STEPS.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-1 text-xs">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <span
            className={`px-2 py-1 rounded ${
              i === currentIdx
                ? 'bg-blue-100 text-blue-700 font-medium'
                : i < currentIdx
                  ? 'text-green-600'
                  : 'text-gray-400'
            }`}
          >
            {i < currentIdx ? '✓' : ''} {STEP_LABELS[s]}
          </span>
          {i < STEPS.length - 1 && <span className="text-gray-300">›</span>}
        </React.Fragment>
      ))}
    </div>
  )
}

const COLLECTION_LABELS: Record<string, string> = {
  animals: 'Animales',
  breedingRecords: 'Registros reproductivos',
  reminders: 'Recordatorios',
  weightRecords: 'Registros de peso',
  farmInvitations: 'Invitaciones',
}

function PreviewTable({ meta }: { meta: BackupMeta }) {
  const exportDate = meta.exportDate
    ? new Date(meta.exportDate).toLocaleDateString('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Desconocida'

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Granja:</span>
        <span className="font-medium">{meta.farmName || meta.farmId}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Fecha de exportación:</span>
        <span className="font-medium">{exportDate}</span>
      </div>
      <hr className="border-gray-200" />
      <p className="text-sm font-medium text-gray-700">Contenido del respaldo:</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(meta.counts).map(([col, count]) => (
          <div key={col} className="flex justify-between">
            <span className="text-gray-600">{COLLECTION_LABELS[col] || col}</span>
            <span className="font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressView({ progress }: { progress: BackupProgress }) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
        <p className="text-sm text-gray-600">{progress.message}</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-xs text-center text-gray-500">{progress.percent}%</p>
    </div>
  )
}

export default ModalRestoreBackup
