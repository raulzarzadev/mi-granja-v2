'use client'

import React, { useState } from 'react'
import { useAnimals } from '@/hooks/useAnimals'
import { useBreeding } from '@/hooks/useBreeding'
import { BirthRecord } from '@/types'
import BreedingCard from '@/components/BreedingCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ModalBreedingForm from './ModalBreedingForm'
import ModalEditBreeding from './ModalEditBreeding'
import ModalBirthForm from './ModalBirthForm'
import ModalConfirmPregnancy from './ModalConfirmPregnancy'
import { useBreedingCRUD } from '@/hooks/useBreedingCRUD'
import { useAnimalCRUD } from '@/hooks/useAnimalCRUD'
import { BreedingRecord } from '@/types/breedings'

/**
 * Sección de reproducción del dashboard
 */
const BreedingSection: React.FC = () => {
  const {
    updateBreedingRecord,
    getActivePregnancies,
    getUpcomingBirths,
    getStats
  } = useBreedingCRUD()
  const { create: createAnimal, remove: removeAnimal } = useAnimalCRUD()
  const { animals } = useAnimals()
  const { breedingRecords, isLoading } = useBreeding()
  const { deleteBreedingRecord } = useBreedingCRUD()

  const [filter, setFilter] = useState<'all' | 'pregnant' | 'upcoming'>('all')
  const [editingRecord, setEditingRecord] = useState<BreedingRecord | null>(
    null
  )
  const [birthRecord, setBirthRecord] = useState<BreedingRecord | null>(null)
  const [confirmPregnancyRecord, setConfirmPregnancyRecord] =
    useState<BreedingRecord | null>(null)

  const stats = getStats()

  // Función para sacar un animal de la monta
  const handleRemoveFromBreeding = async (
    record: BreedingRecord,
    animalId: string
  ) => {
    try {
      if (record.maleId === animalId) {
        // Si es el macho, eliminar todo el registro de monta
        await deleteBreedingRecord(record.id)
      } else {
        // Si es una hembra, removerla de femaleBreedingInfo
        const updatedFemaleInfo = record.femaleBreedingInfo.filter(
          (info) => info.femaleId !== animalId
        )

        if (updatedFemaleInfo.length === 0) {
          // Si no quedan hembras, eliminar el registro completo
          await deleteBreedingRecord(record.id)
        } else {
          // Actualizar el registro sin la hembra removida
          await updateBreedingRecord(record.id, {
            femaleBreedingInfo: updatedFemaleInfo
          })
        }
      }
    } catch (error) {
      console.error('Error removing animal from breeding:', error)
      alert('Error al sacar el animal de la monta')
    }
  }

  // Función para eliminar un parto y sus crías
  const handleDeleteBirth = async (
    record: BreedingRecord,
    femaleId: string
  ) => {
    console.log({ record, femaleId })
    try {
      const updatedFemaleInfo = await Promise.all(
        record.femaleBreedingInfo.map(async (info) => {
          if (info.femaleId === femaleId) {
            const offspring = info.offspring || []

            // Remove associated offspring if birth is cancelled
            if (offspring && offspring.length > 0) {
              try {
                await Promise.all(
                  offspring.map((offspringId) => removeAnimal(offspringId))
                )
                return {
                  ...info,
                  actualBirthDate: null,
                  offspring: []
                }
              } catch (error) {
                console.error('Error removing offspring:', error)
                // Optional: show error notification to user
              }
            }
          }
          return info
        })
      )

      await updateBreedingRecord(record.id, {
        femaleBreedingInfo: updatedFemaleInfo
      })
    } catch (error) {
      console.error('Error deleting birth:', error)
      alert('Error al eliminar el parto')
    }
  }

  // Función para desconfirmar embarazo
  const handleUnconfirmPregnancy = async (
    record: BreedingRecord,
    femaleId: string
  ) => {
    try {
      const updatedFemaleInfo = record.femaleBreedingInfo.map((info) => {
        if (info.femaleId === femaleId) {
          return {
            ...info,
            pregnancyConfirmedDate: null,
            expectedBirthDate: null
          }
        }
        return info
      })

      await updateBreedingRecord(record.id, {
        femaleBreedingInfo: updatedFemaleInfo
      })
    } catch (error) {
      console.error('Error unconfirming pregnancy:', error)
      alert('Error al desconfirmar el embarazo')
    }
  }

  const activePregnancies = getActivePregnancies()
  const upcomingBirths = getUpcomingBirths()

  const getFilteredRecords = () => {
    switch (filter) {
      case 'pregnant':
        return activePregnancies
      case 'upcoming':
        return upcomingBirths
      default:
        return breedingRecords
    }
  }

  const handleUpdateBreeding = async (
    id: string,
    data: Omit<BreedingRecord, 'id' | 'farmerId' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await updateBreedingRecord(id, data)
      setEditingRecord(null)
    } catch (error) {
      console.error('Error updating breeding record:', error)
    }
  }

  const handleBirthSubmit = async (birthData: BirthRecord) => {
    if (!birthRecord) return

    try {
      // Obtener información de la madre y el padre
      const mother = animals.find((a) => a.id === birthData.animalId)
      const father = animals.find((a) => a.id === birthRecord.maleId)

      if (!mother || !father) {
        console.error('No se encontró información de los padres')
        return
      }

      // Crear los nuevos animales (crías) en la base de datos
      const offspringIds = await Promise.all(
        birthData.offspring.map(async (offspring) => {
          const newAnimal = {
            animalNumber: offspring.animalNumber,
            type: mother.type, // Las crías heredan el tipo de la madre
            stage: 'cria' as const,
            weight: offspring.weight || '',
            birthDate: new Date(
              `${birthData.birthDate}T${birthData.birthTime}`
            ),
            gender: offspring.gender,
            motherId: birthData.animalId,
            fatherId: birthRecord.maleId,
            notes: `Color: ${offspring.color || 'No especificado'}. Estado: ${
              offspring.status
            }${
              offspring.healthIssues
                ? `. Problemas de salud: ${offspring.healthIssues}`
                : ''
            }`
          }

          const animalNumber = await createAnimal(newAnimal)
          return animalNumber
        })
      )

      // Actualizar el registro de monta con la información del parto
      const updatedFemaleBreedingInfo = birthRecord.femaleBreedingInfo.map(
        (info) => {
          if (info.femaleId === birthData.animalId) {
            return {
              ...info,
              actualBirthDate: new Date(
                `${birthData.birthDate}T${birthData.birthTime}`
              ),
              offspring: offspringIds.filter(Boolean) as string[]
            }
          }
          return info
        }
      )

      await updateBreedingRecord(birthRecord.id, {
        ...birthRecord,
        femaleBreedingInfo: updatedFemaleBreedingInfo
      })

      setBirthRecord(null)
    } catch (error) {
      console.error('Error registrando parto:', error, birthData)
    }
  }

  // Manejar confirmación de embarazos
  const handleConfirmPregnancy = async (updatedRecord: BreedingRecord) => {
    try {
      await updateBreedingRecord(updatedRecord.id, updatedRecord)
      setConfirmPregnancyRecord(null)
    } catch (error) {
      console.error('Error confirmando embarazos:', error)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reproducción</h2>
          <ModalBreedingForm />
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🐣</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Total Montas
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.totalBreedings}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🤰</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Embarazadas</p>
                <p className="text-xl font-bold text-blue-600">
                  {stats.activePregnancies}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🗓️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Partos Próximos
                </p>
                <p className="text-xl font-bold text-yellow-600">
                  {stats.upcomingBirths}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🐾</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Crías</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.totalOffspring}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">Registros</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos ({breedingRecords.length})
            </button>
            <button
              onClick={() => setFilter('pregnant')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'pregnant'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Embarazadas ({activePregnancies.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Próximos Partos ({upcomingBirths.length})
            </button>
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white rounded-lg shadow p-6">
        {getFilteredRecords().length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🐣</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? 'No hay registros de reproducción'
                : filter === 'pregnant'
                ? 'No hay animales embarazados'
                : 'No hay partos próximos'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Comienza registrando tu primera monta'
                : 'Cambia el filtro para ver otros registros'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredRecords().map((record) => (
              <BreedingCard
                key={record.id}
                record={record}
                animals={animals}
                onEdit={(record) => {
                  setEditingRecord(record)
                }}
                onAddBirth={(record) => {
                  setBirthRecord(record)
                }}
                onConfirmPregnancy={(record) => {
                  setConfirmPregnancyRecord(record)
                }}
                onUnconfirmPregnancy={handleUnconfirmPregnancy}
                onDelete={async (record) => {
                  await deleteBreedingRecord(record.id)
                }}
                onRemoveFromBreeding={handleRemoveFromBreeding}
                onDeleteBirth={handleDeleteBirth}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <ModalEditBreeding
        animals={animals}
        record={editingRecord}
        onSubmit={handleUpdateBreeding}
        onClose={() => setEditingRecord(null)}
        isLoading={isLoading}
      />

      {/* Modal de registro de parto */}

      <ModalBirthForm
        isOpen={!!birthRecord}
        onClose={() => setBirthRecord(null)}
        breedingRecord={birthRecord!}
        animals={animals}
        onSubmit={handleBirthSubmit}
        isLoading={isLoading}
      />

      {/* Modal de confirmación de embarazos */}
      <ModalConfirmPregnancy
        isOpen={!!confirmPregnancyRecord}
        onClose={() => setConfirmPregnancyRecord(null)}
        breedingRecord={confirmPregnancyRecord!}
        animals={animals}
        onSubmit={handleConfirmPregnancy}
        isLoading={isLoading}
      />
    </div>
  )
}

export default BreedingSection
