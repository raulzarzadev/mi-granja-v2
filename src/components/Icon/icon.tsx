import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaCog,
  FaHome,
  FaUser,
  FaBell,
  FaQuestionCircle,
  FaSignOutAlt
} from 'react-icons/fa'
import { IconType } from 'react-icons'

export interface IconProps {
  icon: IconName
  className?: string
  size?: number
}

export const icons: Record<string, IconType> = {
  add: FaPlus,
  edit: FaEdit,
  delete: FaTrash,
  view: FaEye,
  search: FaSearch,
  settings: FaCog,
  home: FaHome,
  profile: FaUser,
  notifications: FaBell,
  help: FaQuestionCircle,
  logout: FaSignOutAlt
}
export type IconName = keyof typeof icons
// https://react-icons.github.io/react-icons/

export const Icon = ({ icon, className = '', size }: IconProps) => {
  const IconComponent = icons[icon]

  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found`)
    return null
  }

  const sizeClass = size ? `w-${size} h-${size}` : 'w-6 h-6'

  return (
    <IconComponent
      className={`${sizeClass} ${className}`}
      aria-label={`${icon} icon`}
    />
  )
}
