import type { IconType } from 'react-icons'
import {
  FaBell,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarDay,
  FaCheckCircle,
  FaCog,
  FaCommentDots,
  FaEdit,
  FaEllipsisV,
  FaEye,
  FaFemale,
  FaHome,
  FaMale,
  FaPlus,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
  FaStickyNote,
  FaTrash,
  FaUser,
} from 'react-icons/fa'
import { IoMdCloseCircleOutline } from 'react-icons/io'
import { IoBedSharp } from 'react-icons/io5'
import { LuBaby } from 'react-icons/lu'
import { MdOutlinePregnantWoman } from 'react-icons/md'
import { TbBabyBottle } from 'react-icons/tb'

const BabyBottleOffIcon: IconType = ({ className }) => (
  <span aria-hidden="true" className={`relative inline-flex ${className ?? ''}`}>
    <TbBabyBottle aria-hidden="true" className="absolute inset-0 h-full w-full" />
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 h-0.5 w-[125%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current"
    />
  </span>
)

export interface IconProps {
  icon: IconName
  className?: string
  size?: number
}

export const icons = {
  male: FaMale,
  female: FaFemale,
  bed: IoBedSharp,
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
  logout: FaSignOutAlt,
  baby: LuBaby,
  pregnant: MdOutlinePregnantWoman,
  calendarCheck: FaCalendarCheck,
  calendarDay: FaCalendarDay,
  calendar: FaCalendarAlt,
  more: FaEllipsisV,
  close: IoMdCloseCircleOutline,
  check_circle: FaCheckCircle,
  babyBottle: TbBabyBottle,
  babyBottleOff: BabyBottleOffIcon,
  notes: FaStickyNote,
  comments: FaCommentDots,
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
