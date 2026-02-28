'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useBackup, BackupProgress, RestoreResult } from '@/hooks/useBackup'
import { BackupFile, BackupMeta, ValidationResult } from '@/lib/backup-serialization'
import { Modal } from './Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'upload' | 'preview' | 'mode' | 'confirm' | 'progress' | 'result'

const ModalRestoreBackup: React.FC<Props> = ({ isOpen, onClose }) => {
  const { parseBackupFile, restoreBackup, isRestoring, progress } = useBackup()

  const [step, setStep] = useState<Step>('upload')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [backupData, setBackupData] = useState<BackupFile | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [finalConfirmed, setFinalConfirmed] = useState(false)
  const [result, setResult] = useState<RestoreResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setValidation(null)
    setBackupData(null)
    setMode('merge')
    setReplaceConfirmed(false)
    setFinalConfirmed(false)
    setResult(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClose = () => {
    if (isRestoring) return
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

        {/* Paso 2: Vista previa */}
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
                      Los datos del respaldo se agregan como documentos nuevos a tu granja actual.
                      Los datos existentes no se modifican ni se borran.
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
                      Se borran todos los animales, registros y recordatorios existentes
                      y se reemplazan con los del respaldo. La granja y las invitaciones no se borran.
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
                onClick={() => {
                  setFinalConfirmed(false)
                  setStep('confirm')
                }}
                disabled={mode === 'replace' && !replaceConfirmed}
                className={`px-4 py-2 text-sm rounded-lg text-white ${
                  mode === 'replace' && !replaceConfirmed
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Revisar antes de ejecutar
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Confirmación final — detalle de lo que se hará */}
        {step === 'confirm' && backupData && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                ⚠️ Revisa cuidadosamente antes de continuar
              </p>
              <p className="text-xs text-amber-800">
                Esta funcionalidad está en prueba. Verifica que la información sea correcta.
              </p>
            </div>

            {/* Resumen de acciones */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                {mode === 'replace'
                  ? 'Se borrarán los datos actuales y se importará lo siguiente:'
                  : 'Se agregarán los siguientes datos nuevos a tu granja:'}
              </p>

              {mode === 'replace' && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  Primero se eliminarán todos los animales, registros reproductivos,
                  recordatorios y registros de peso existentes en esta granja.
                </div>
              )}
            </div>

            {/* Lista de animales que se crearán */}
            <ConfirmAnimalsTable animals={backupData.animals || []} />

            {/* Otros conteos */}
            <ConfirmOtherCollections data={backupData} mode={mode} />

            {/* Checkbox final */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalConfirmed}
                  onChange={(e) => setFinalConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-800">
                  He revisado los datos y confirmo que quiero
                  {mode === 'replace'
                    ? ' reemplazar todos los datos de mi granja con este respaldo.'
                    : ' agregar estos datos a mi granja.'}
                </span>
              </label>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('mode')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Volver
              </button>
              <button
                onClick={handleRestore}
                disabled={!finalConfirmed}
                className={`px-4 py-2 text-sm rounded-lg text-white ${
                  !finalConfirmed
                    ? 'bg-gray-400 cursor-not-allowed'
                    : mode === 'replace'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {mode === 'replace' ? 'Reemplazar datos ahora' : 'Importar datos ahora'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 5: Progreso */}
        {step === 'progress' && <ProgressView progress={progress} />}

        {/* Paso 6: Resultado */}
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
              <p className="text-sm font-medium text-gray-700 mb-2">Documentos creados:</p>
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
  confirm: 'Verificar',
  progress: 'Progreso',
  result: 'Resultado',
}

const STEPS: Step[] = ['upload', 'preview', 'mode', 'confirm', 'progress', 'result']

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIdx = STEPS.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-1 text-xs flex-wrap">
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

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  oveja: 'Oveja',
  vaca: 'Vaca',
  cabra: 'Cabra',
  cerdo: 'Cerdo',
  gallina: 'Gallina',
  perro: 'Perro',
  gato: 'Gato',
  equino: 'Equino',
  otro: 'Otro',
}

const GENDER_LABELS: Record<string, string> = {
  macho: 'M',
  hembra: 'H',
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

function ConfirmAnimalsTable({ animals }: { animals: Record<string, unknown>[] }) {
  if (animals.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
        No hay animales en este respaldo.
      </div>
    )
  }

  const MAX_PREVIEW = 20
  const shown = animals.slice(0, MAX_PREVIEW)
  const remaining = animals.length - MAX_PREVIEW

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">
        Animales a crear ({animals.length}):
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Arete</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Raza</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Sexo</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((animal, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-xs">
                    {(animal.animalNumber as string) || '-'}
                  </td>
                  <td className="px-3 py-1.5">
                    {ANIMAL_TYPE_LABELS[(animal.type as string) || ''] || (animal.type as string) || '-'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {(animal.breed as string) || '-'}
                  </td>
                  <td className="px-3 py-1.5">
                    {GENDER_LABELS[(animal.gender as string) || ''] || (animal.gender as string) || '-'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        (animal.status as string) === 'activo' || !animal.status
                          ? 'bg-green-100 text-green-800'
                          : (animal.status as string) === 'muerto'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {(animal.status as string) || 'activo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {remaining > 0 && (
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-t">
            ... y {remaining} animales más
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmOtherCollections({
  data,
  mode,
}: {
  data: BackupFile
  mode: 'merge' | 'replace'
}) {
  const items = [
    {
      label: 'Registros reproductivos',
      count: data.breedingRecords?.length || 0,
      detail: 'Se crearán como registros nuevos con referencias actualizadas a los nuevos animales.',
    },
    {
      label: 'Recordatorios',
      count: data.reminders?.length || 0,
      detail: 'Se crearán nuevos recordatorios asociados a tu usuario y granja actual.',
    },
    {
      label: 'Registros de peso',
      count: data.weightRecords?.length || 0,
      detail: 'Se crearán como registros nuevos.',
    },
  ]

  const hasData = items.some((it) => it.count > 0)
  if (!hasData) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">Otros datos a importar:</p>
      <div className="space-y-2">
        {items
          .filter((it) => it.count > 0)
          .map((it) => (
            <div key={it.label} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {it.count}x
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{it.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{it.detail}</p>
              </div>
            </div>
          ))}
      </div>
      {mode === 'merge' && (
        <p className="text-xs text-gray-500">
          Todos los datos se crean como documentos nuevos. Los datos existentes en tu granja no se
          modifican.
        </p>
      )}
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
