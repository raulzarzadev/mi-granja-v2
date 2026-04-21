'use client'

import React, { useCallback, useRef, useState } from 'react'
import { BackupProgress, RestoreResult, useBackup } from '@/hooks/useBackup'
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
  const [copied, setCopied] = useState(false)
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
    if (result?.success) {
      window.location.reload()
      return
    }
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

            <details className="text-sm border border-gray-200 rounded-lg">
              <summary className="cursor-pointer px-4 py-2 text-gray-600 hover:text-gray-800 font-medium select-none">
                Ver formato requerido del archivo
              </summary>
              <div className="px-4 pb-3 pt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">
                    El archivo debe ser .json con esta estructura. Las fechas en formato ISO 8601
                    (ej: 2026-03-04T12:00:00.000Z).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(BACKUP_SCHEMA_JSON.trim())
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="flex-shrink-0 ml-2 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <pre className="bg-gray-50 border border-gray-200 text-[11px] leading-relaxed p-3 rounded-lg overflow-auto max-h-72 text-gray-700">
                  {BACKUP_SCHEMA_JSON}
                </pre>
              </div>
            </details>

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
                      Se borran todos los animales, registros y recordatorios existentes y se
                      reemplazan con los del respaldo. La granja y las invitaciones no se borran.
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
                    registros reproductivos, recordatorios y registros de peso de esta granja. Esta
                    acción no se puede deshacer.
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
                  Primero se eliminarán todos los animales, registros reproductivos, recordatorios y
                  registros de peso existentes en esta granja.
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
  sales: 'Ventas',
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
      <p className="text-sm font-medium text-gray-900">Animales a crear ({animals.length}):</p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Arete</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Nombre</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Especie</th>
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
                  <td className="px-3 py-1.5 text-gray-600">{(animal.name as string) || '-'}</td>
                  <td className="px-3 py-1.5">
                    {ANIMAL_TYPE_LABELS[(animal.type as string) || ''] ||
                      (animal.type as string) ||
                      '-'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">{(animal.breed as string) || '-'}</td>
                  <td className="px-3 py-1.5">
                    {GENDER_LABELS[(animal.gender as string) || ''] ||
                      (animal.gender as string) ||
                      '-'}
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

function ConfirmOtherCollections({ data, mode }: { data: BackupFile; mode: 'merge' | 'replace' }) {
  const items = [
    {
      label: 'Registros reproductivos',
      count: data.breedingRecords?.length || 0,
      detail:
        'Se crearán como registros nuevos con referencias actualizadas a los nuevos animales.',
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
    {
      label: 'Ventas',
      count: data.sales?.length || 0,
      detail: 'Se crearán como ventas nuevas con referencias actualizadas a los nuevos animales.',
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

const BACKUP_SCHEMA_JSON = `{
  "_meta": {
    "version": 1,
    "exportDate": "ISO 8601",
    "farmId": "string",
    "farmName": "string",
    "exportedBy": "string (userId)",
    "counts": {
      "animals": 0,
      "breedingRecords": 0,
      "reminders": 0,
      "weightRecords": 0,
      "farmInvitations": 0,
      "sales": 0
    }
  },
  "_types": {
    "animal": {
      "id": "string",
      "farmerId": "string (ID del usuario)",
      "farmId": "string (ID de la granja)",
      "animalNumber": "string (arete/identificador)",
      "name": "string (nombre opcional)",
      "type": "oveja | vaca | cabra | cerdo | gallina | perro | gato | equino | otro",
      "gender": "macho | hembra",
      "breed": "string (raza, opcional)",
      "stage": "cria | juvenil | engorda | reproductor | descarte",
      "status": "activo | muerto | vendido | perdido",
      "statusAt": "ISO 8601 (opcional, fecha del cambio de status)",
      "statusNotes": "string (notas sobre el cambio de status, opcional)",
      "birthDate": "ISO 8601 (opcional)",
      "weight": "number en gramos (opcional, ej: 4500 = 4.5kg)",
      "age": "number (edad en meses, opcional — se calcula desde birthDate)",
      "motherId": "string ID animal madre (opcional)",
      "fatherId": "string ID animal padre (opcional)",
      "batch": "string (lote, opcional)",
      "notes": "string (opcional)",
      "isWeaned": "true | false (opcional)",
      "weanedAt": "ISO 8601 (opcional)",
      "weaningDestination": "engorda | reproductor (destino al destetar, opcional)",
      "weightRecords": "[{ date, weight (gramos), age? (meses), notes? }] (opcional)",
      "soldInfo": "{ date, buyer?, weight? (gramos), price? (centavos) } (si vendido)",
      "lostInfo": "{ lostAt, foundAt? } (si perdido)",
      "records": "[{ id, type, category, title, date, severity?, isResolved?, resolvedDate?, treatment?, nextDueDate?, batch?, veterinarian?, cost?, notes?, appliedToAnimals?, isBulkApplication?, createdAt, createdBy, updatedAt? }] (opcional)",
      "customWeaningDays": "number (override días de destete, opcional)",
      "pregnantAt": "ISO 8601 | null (fecha confirmación embarazo, solo hembras)",
      "pregnantBy": "string | null (ID del macho que la preñó, solo hembras)",
      "birthedAt": "ISO 8601 | null (fecha de parto como madre, solo hembras)",
      "weanedMotherAt": "ISO 8601 | null (fecha en que destetó sus crías, solo hembras)",
      "adminAction": "{ performedByAdmin, adminEmail?, adminId?, originalTimestamp, impersonationReason? } (opcional)",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "breedingRecord": {
      "id": "string",
      "breedingId": "string (ID legible, ej: 10-10-25-01, opcional)",
      "farmerId": "string",
      "farmId": "string",
      "maleId": "string (ID del animal macho)",
      "breedingDate": "ISO 8601 | null",
      "femaleBreedingInfo": "[{
        femaleId, pregnancyConfirmedDate?,
        expectedBirthDate?, actualBirthDate?,
        offspring?: string[]
      }]",
      "status": "active | finished (opcional, default: active)",
      "notes": "string (opcional)",
      "comments": "[{ id, content, urgency?, createdAt? }] (opcional)",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "reminder": {
      "id": "string",
      "farmerId": "string",
      "farmId": "string",
      "animalNumber": "string arete (opcional, deprecated)",
      "animalNumbers": "[string] aretes de animales asociados (opcional)",
      "title": "string",
      "description": "string",
      "dueDate": "ISO 8601",
      "completed": "true | false",
      "completionByAnimal": "{ animalNumber: true/false } estado por animal (opcional)",
      "priority": "low | medium | high",
      "type": "medical | breeding | feeding | weight | other",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "weightRecord": {
      "id": "string",
      "animalNumber": "string (arete)",
      "weight": "number (en gramos)",
      "date": "ISO 8601",
      "notes": "string (opcional)"
    },
    "farmInvitation": {
      "id": "string",
      "farmId": "string",
      "email": "string",
      "role": "admin | manager | caretaker | veterinarian | viewer",
      "permissions": "[{ module, actions[] }]",
      "invitedBy": "string",
      "status": "pending | accepted | rejected | expired | revoked",
      "expiresAt": "ISO 8601",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "farm": {
      "id": "string",
      "name": "string",
      "description": "string (opcional)",
      "ownerId": "string",
      "location": "{ address?, city?, state?, country?, coordinates?: { lat, lng } } (opcional)",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "sale": {
      "id": "string",
      "farmId": "string",
      "farmerId": "string",
      "animals": "[{ animalId, animalNumber, weight? (gramos) }]",
      "date": "ISO 8601 (opcional)",
      "pricePerKg": "number centavos/kg (opcional)",
      "priceType": "en_pie | en_canal",
      "buyer": "string (opcional)",
      "notes": "string (opcional)",
      "status": "scheduled | pending | completed | cancelled",
      "createdBy": "string",
      "updatedBy": "string",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    },
    "_reglas_de_negocio": {
      "_nota": "Reglas que deben cumplirse para que los datos importados funcionen correctamente",
      "campos_obligatorios_animal": "animalNumber, type, stage, gender, createdAt, updatedAt",
      "campos_nunca_undefined": "Firestore no acepta undefined. Omitir el campo por completo en vez de ponerlo como undefined.",
      "peso_en_gramos": "weight y soldInfo.price se almacenan en gramos y centavos respectivamente",
      "fechas_iso_8601": "Todas las fechas deben estar en formato ISO 8601 (ej: 2026-03-17T00:00:00.000Z)",
      "etapas_por_edad": "cria=no destetado, juvenil=destetado pero sin edad reproductiva, engorda=manual, reproductor=edad reproductiva alcanzada, descarte=manual",
      "destete": "Al destetar una cría: isWeaned=true, weanedAt=fecha, stage cambia según destino. Para engorda→stage=engorda. Para reproductor→stage=juvenil.",
      "nacimiento_muerto": "Si una cría nace muerta: status=muerto, statusAt=fecha del parto",
      "estado_reproductivo": "Solo hembras. pregnantAt=embarazada, birthedAt=parida, weanedMotherAt=destetó. Cada transición limpia el estado anterior.",
      "ids_de_referencia": "motherId, fatherId, maleId, femaleId, offspring[] — son IDs internos. Al importar se remapean automáticamente.",
      "peso_auto_sync": "Si weight está presente pero weightRecords y records están vacíos, al importar se genera una entrada sintética con fecha=updatedAt (o createdAt) para mantener consistencia."
    }
  },
  "farm": { },
  "animals": [ ],
  "breedingRecords": [ ],
  "reminders": [ ],
  "weightRecords": [ ],
  "farmInvitations": [ ],
  "sales": [ ]
}`

export default ModalRestoreBackup
