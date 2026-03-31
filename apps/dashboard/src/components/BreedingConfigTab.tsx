'use client'

import { ANIMAL_BREEDING_CONFIGS } from '@/lib/animalBreedingConfig'
import { animals_types_labels, AnimalType } from '@/types/animals'

const formatMonths = (months: number) => {
  if (months >= 12) {
    const y = Math.floor(months / 12)
    const m = months % 12
    return m > 0 ? `${y}a ${m}m` : `${y}a`
  }
  return `${months}m`
}

export default function BreedingConfigTab() {
  const configs = Object.values(ANIMAL_BREEDING_CONFIGS)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Configuración de razas</h3>
        <p className="text-xs text-gray-500">
          Tiempos y edades por defecto usados para calcular etapas, gestación y destete.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="py-2 pr-4">Especie</th>
              <th className="py-2 px-3 text-center">Gestación</th>
              <th className="py-2 px-3 text-center">Destete</th>
              <th className="py-2 px-3 text-center">Edad reprod.</th>
              <th className="py-2 px-3 text-center">Ciclo estral</th>
              <th className="py-2 px-3 text-center">Camada prom.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.map((config) => (
              <tr key={config.type} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-gray-900">
                  {animals_types_labels[config.type as AnimalType] || config.type}
                </td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {config.gestationDays}d
                </td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {config.weaningDays}d
                </td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {formatMonths(config.minBreedingAge)}
                  {config.maxBreedingAge ? ` — ${formatMonths(config.maxBreedingAge)}` : ''}
                </td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {config.breedingCycleDays}d
                </td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {config.averageLitterSize}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 space-y-1">
        <p><strong>Gestación:</strong> días de embarazo estimados</p>
        <p><strong>Destete:</strong> días recomendados para destetar crías</p>
        <p><strong>Edad reprod.:</strong> edad mínima para reproducción</p>
        <p><strong>Ciclo estral:</strong> duración del ciclo reproductivo</p>
        <p><strong>Camada prom.:</strong> número promedio de crías por parto</p>
      </div>
    </div>
  )
}
