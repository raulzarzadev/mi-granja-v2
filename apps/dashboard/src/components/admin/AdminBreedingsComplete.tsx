'use client'

import React from 'react'
import { useAdminBreedings } from '@/hooks/admin/useAdminBreedings'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function AdminBreedingsComplete() {
  const { breedings, isLoading, error } = useAdminBreedings()

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
        <p className="text-red-700">Error al cargar reproducciones: {error}</p>
      </div>
    )
  }

  // Estadísticas rápidas
  const totalPregnancies = breedings.reduce((total, breeding) => {
    return (
      total +
      (breeding.femaleBreedingInfo?.filter(
        (info) => info.pregnancyConfirmedDate
      ).length || 0)
    )
  }, 0)

  const totalBirths = breedings.reduce((total, breeding) => {
    return (
      total +
      (breeding.femaleBreedingInfo?.filter((info) => info.actualBirthDate)
        .length || 0)
    )
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Reproducciones
          </h1>
          <p className="text-gray-600 mt-1">
            Vista general de las reproducciones en el sistema
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {breedings.length} reproducciones
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Reproducciones</div>
          <div className="text-2xl font-bold text-gray-900">
            {breedings.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Embarazos Confirmados</div>
          <div className="text-2xl font-bold text-pink-600">
            {totalPregnancies}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Nacimientos</div>
          <div className="text-2xl font-bold text-green-600">{totalBirths}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tasa de Éxito</div>
          <div className="text-2xl font-bold text-blue-600">
            {breedings.length > 0
              ? Math.round((totalBirths / breedings.length) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Lista de reproducciones */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Monta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Macho
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hembras
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granjero
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {breedings.map((breeding) => (
              <tr key={breeding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {breeding.breedingDate
                    ? format(breeding.breedingDate, 'PP', { locale: es })
                    : 'Sin fecha'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {breeding.maleId || 'No especificado'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {breeding.femaleBreedingInfo?.length || 0} hembras
                  </div>
                  <div className="text-xs text-gray-500">
                    {breeding.femaleBreedingInfo?.map((info, index) => (
                      <span key={index} className="mr-2">
                        #{info.femaleId}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {breeding.farmerId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    {breeding.femaleBreedingInfo?.map((info, index) => {
                      if (info.actualBirthDate) {
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            🐄 Nacido
                          </span>
                        )
                      } else if (info.pregnancyConfirmedDate) {
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                          >
                            🤰 Embarazada
                          </span>
                        )
                      } else {
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                          >
                            ⏳ Pendiente
                          </span>
                        )
                      }
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {breedings.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No se encontraron reproducciones registradas
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
