import {
  PiBaby,
  PiBed,
  PiBell,
  PiCalendar,
  PiCalendarCheck,
  PiCalendarDot,
  PiChatCircleDots,
  PiCheckCircle,
  PiDotsThreeVertical,
  PiEye,
  PiGear,
  PiHouse,
  PiMagnifyingGlass,
  PiNote,
  PiPencilSimple,
  PiPlus,
  PiQuestion,
  PiSignOut,
  PiTrash,
  PiUser,
  PiXCircle,
} from 'react-icons/pi'
import { BabyBottle, BabyBottleOff, Man, Pregnant, Woman } from './farm-icons'

export interface IconProps {
  icon: IconName
  className?: string
  size?: number
}

export const icons = {
  male: Man,
  female: Woman,
  bed: PiBed,
  add: PiPlus,
  edit: PiPencilSimple,
  delete: PiTrash,
  view: PiEye,
  search: PiMagnifyingGlass,
  settings: PiGear,
  home: PiHouse,
  profile: PiUser,
  notifications: PiBell,
  help: PiQuestion,
  logout: PiSignOut,
  baby: PiBaby,
  pregnant: Pregnant,
  calendarCheck: PiCalendarCheck,
  calendarDay: PiCalendarDot,
  calendar: PiCalendar,
  more: PiDotsThreeVertical,
  close: PiXCircle,
  check_circle: PiCheckCircle,
  babyBottle: BabyBottle,
  babyBottleOff: BabyBottleOff,
  notes: PiNote,
  comments: PiChatCircleDots,
} as const
export type IconName = keyof typeof icons
// https://react-icons.github.io/react-icons/

export const Icon = ({ icon, className = '', size }: IconProps) => {
  const IconComponent = icons[icon]

  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found`)
    return null
  }

  const sizeClass = size ? `w-${size} h-${size}` : 'w-6 h-6'

  // If the icon is a string (like '🤰'), render it directly
  if (typeof IconComponent === 'string') {
    return <span className={`${sizeClass} ${className}`}>{IconComponent}</span>
  }

  return <IconComponent className={`${sizeClass} ${className}`} aria-label={`${icon} icon`} />
}
