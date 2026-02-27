import { AnimalBreedingStatus, AnimalStatus } from '@/types/animals'

export const BadgeAnimalStatus = ({
  status,
}: {
  status?: AnimalStatus | AnimalBreedingStatus | ''
}) => {
  let bgColor = ''
  let text = ''

  switch (status) {
    case 'activo':
      bgColor = 'bg-green-100 text-green-800'
      text = 'Activo'
      break
    case 'muerto':
      bgColor = 'bg-red-100 text-red-800'
      text = 'Muerto'
      break
    case 'vendido':
      bgColor = 'bg-yellow-100 text-yellow-800'
      text = 'Vendido'
      break
    case 'perdido':
      bgColor = 'bg-gray-100 text-gray-800'
      text = 'Perdido'
      break
    case 'monta':
      bgColor = 'bg-indigo-100 text-indigo-800'
      text = 'En monta'
      break
    case 'embarazada':
      bgColor = 'bg-purple-100 text-purple-800'
      text = 'Embarazada'
      break
    case 'parida':
      bgColor = 'bg-pink-100 text-pink-800'
      text = 'Parida'
      break
    default:
      bgColor = 'bg-gray-100 text-gray-800'
      text = 'Desconocido'
  }

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${bgColor}`}>{text}</span>
  )
}
