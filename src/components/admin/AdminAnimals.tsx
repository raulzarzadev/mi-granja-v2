'use client'

import React from 'react'
import { useAdminAnimals } from '@/hooks/admin/useAdminAnimals'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import LoadingSpinner from '@/components/LoadingSpinner'
import { animal_icon, animal_stage_labels, gender_icon } from '@/types/animals'

export default function AdminAnimals() {
  const { animals, isLoading, error } = useAdminAnimals()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error al cargar animales: {error}</p>
      </div>
    )
  }

  // Agrupar animales por granjero
  const animalsByFarmer = animals.reduce((acc, animal) => {
    if (!acc[animal.farmerId]) {
      acc[animal.farmerId] = []
    }
    acc[animal.farmerId].push(animal)
    return acc
  }, {} as Record<string, typeof animals>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Animales
          </h1>
          <p className="text-gray-600 mt-1">
            Vista general de todos los animales en el sistema
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {animals.length} animales
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Granjeros con animales</div>
          <div className="text-2xl font-bold text-gray-900">
            {Object.keys(animalsByFarmer).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Promedio por granjero</div>
          <div className="text-2xl font-bold text-gray-900">
            {Object.keys(animalsByFarmer).length > 0
              ? Math.round(animals.length / Object.keys(animalsByFarmer).length)
              : 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tipos de animales</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(animals.map((a) => a.type)).size}
          </div>
        </div>
      </div>

      {/* Lista de animales */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Animal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo/Etapa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granjero
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Peso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Registro
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {animals.map((animal) => (
              <tr key={animal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {animal_icon[animal.type]}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{animal.animalNumber}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        {gender_icon[animal.gender]} {animal.gender}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 capitalize">
                    {animal.type}
                  </div>
                  <div className="text-sm text-gray-500">
                    {animal_stage_labels[animal.stage]}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {animal.farmerId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {animal.weight ? `${animal.weight} kg` : 'No registrado'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(animal.createdAt, 'PP', { locale: es })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
