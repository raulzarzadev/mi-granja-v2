'use client'

import type { ReactNode } from 'react'
import type { IconBaseProps, IconType } from 'react-icons'
import {
  PiAlarm,
  PiArrowCounterClockwise,
  PiArrowsClockwise,
  PiArrowsHorizontal,
  PiArrowsLeftRight,
  PiBaby,
  PiBandaids,
  PiBed,
  PiBell,
  PiBookOpen,
  PiBriefcase,
  PiBroadcast,
  PiBug,
  PiCalendar,
  PiCalendarBlank,
  PiCalendarDots,
  PiCarrot,
  PiCat,
  PiChartBar,
  PiChatCircle,
  PiCheck,
  PiCheckCircle,
  PiCheckSquare,
  PiClipboardText,
  PiCoins,
  PiConfetti,
  PiCow,
  PiCrane,
  PiCreditCard,
  PiCrown,
  PiCurrencyDollar,
  PiDna,
  PiDog,
  PiDoorOpen,
  PiDownloadSimple,
  PiEgg,
  PiEnvelopeSimple,
  PiEye,
  PiFileText,
  PiFirstAid,
  PiFish,
  PiFloppyDisk,
  PiFolder,
  PiGear,
  PiGrains,
  PiHandHeart,
  PiHardHat,
  PiHash,
  PiHeart,
  PiHorse,
  PiHouse,
  PiHouseLine,
  PiHouseSimple,
  PiLeaf,
  PiLightbulb,
  PiLightning,
  PiLock,
  PiMagnifyingGlass,
  PiMapPin,
  PiMaskHappy,
  PiMegaphone,
  PiMoon,
  PiNotePencil,
  PiOrange,
  PiPackage,
  PiPalette,
  PiPawPrint,
  PiPill,
  PiPlant,
  PiPlus,
  PiPottedPlant,
  PiPrinter,
  PiProhibit,
  PiPushPin,
  PiQuestion,
  PiRecycle,
  PiRocketLaunch,
  PiScales,
  PiScissors,
  PiShieldCheck,
  PiShuffle,
  PiSiren,
  PiSkull,
  PiSparkle,
  PiSquare,
  PiStar,
  PiStethoscope,
  PiStorefront,
  PiSun,
  PiSunHorizon,
  PiSyringe,
  PiTestTube,
  PiToolbox,
  PiTractor,
  PiTrafficCone,
  PiTrash,
  PiTrendUp,
  PiTruck,
  PiUser,
  PiUsers,
  PiVirus,
  PiWarning,
  PiWrench,
  PiX,
  PiXCircle,
  PiYarn,
} from 'react-icons/pi'
import {
  BabyBottle,
  BloodBag,
  Calf,
  Chicken,
  Goat,
  FieldFlag,
  Man,
  Pig,
  Pregnant,
  Sheep,
  Steak,
  Woman,
} from './farm-icons'

const dot = (colorClass: string, displayName: string): IconType => {
  const Dot = ({ className }: IconBaseProps) => (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full ${colorClass} ${className ?? ''}`}
      style={{ width: '0.6em', height: '0.6em' }}
    />
  )
  Dot.displayName = displayName
  return Dot
}
const DotGreen = dot('bg-green-500', 'DotGreen')
const DotYellow = dot('bg-yellow-400', 'DotYellow')
const DotRed = dot('bg-red-500', 'DotRed')

/**
 * Emoji → icono Phosphor. Los datos (configs en @mi-granja/shared, emails, push) siguen
 * usando emojis como texto; la UI los dibuja con este mapa para mantener un solo estilo.
 */
export const EMOJI_ICON_GROUPS: Array<{ title: string; items: Array<[string, IconType]> }> = [
  {
    title: 'Especies',
    items: [
      ['🐄', PiCow],
      ['🐂', PiCow],
      ['🐑', Sheep],
      ['🐐', Goat],
      ['🐷', Pig],
      ['🐖', Pig],
      ['🐔', Chicken],
      ['🐓', Chicken],
      ['🐴', PiHorse],
      ['🐎', PiHorse],
      ['🐶', PiDog],
      ['🐱', PiCat],
      ['🐟', PiFish],
      ['🐝', PiBug],
      ['🐾', PiPawPrint],
    ],
  },
  {
    title: 'Sexo, etapas y reproducción',
    items: [
      ['♂', Man],
      ['♀', Woman],
      ['👶', PiBaby],
      ['🌱', PiPlant],
      ['🍖', Steak],
      ['🥩', Steak],
      ['❤️', PiHeart],
      ['💕', PiHandHeart],
      ['🚫', PiProhibit],
      ['🛏️', PiBed],
      ['🤰', Pregnant],
      ['🍼', BabyBottle],
      ['🐣', Calf],
      ['🥚', PiEgg],
      ['🥛', BabyBottle],
      ['🩸', BloodBag],
      ['💀', PiSkull],
    ],
  },
  {
    title: 'Salud',
    items: [
      ['🏥', BloodBag],
      ['⚕️', PiFirstAid],
      ['🩺', PiStethoscope],
      ['💊', PiPill],
      ['💉', PiSyringe],
      ['🦠', PiVirus],
      ['🩹', PiBandaids],
      ['🐛', PiBug],
      ['🧪', PiTestTube],
      ['🧬', PiDna],
      ['👁️', PiEye],
      ['⚖️', PiScales],
    ],
  },
  {
    title: 'Granja y cultivos',
    items: [
      ['🚜', PiTractor],
      ['🌾', PiGrains],
      ['🌿', PiLeaf],
      ['🪴', PiPottedPlant],
      ['🥬', PiCarrot],
      ['🍎', PiOrange],
      ['🧶', PiYarn],
      ['⛳', FieldFlag],
      ['📍', PiMapPin],
      ['🏠', PiHouse],
      ['🏡', PiHouseLine],
      ['🏚️', PiHouseSimple],
      ['🏗️', PiCrane],
      ['🏪', PiStorefront],
      ['🚪', PiDoorOpen],
    ],
  },
  {
    title: 'Dinero y gastos',
    items: [
      ['💰', PiCoins],
      ['💲', PiCurrencyDollar],
      ['💳', PiCreditCard],
      ['🔧', PiWrench],
      ['🛠️', PiToolbox],
      ['🚛', PiTruck],
      ['👷', PiHardHat],
      ['💼', PiBriefcase],
    ],
  },
  {
    title: 'Registros y archivos',
    items: [
      ['📝', PiNotePencil],
      ['📋', PiClipboardText],
      ['📌', PiPushPin],
      ['📄', PiFileText],
      ['📁', PiFolder],
      ['📦', PiPackage],
      ['💾', PiFloppyDisk],
      ['📥', PiDownloadSimple],
      ['🖨️', PiPrinter],
      ['✂️', PiScissors],
      ['📊', PiChartBar],
      ['📈', PiTrendUp],
      ['🔢', PiHash],
      ['🔍', PiMagnifyingGlass],
    ],
  },
  {
    title: 'Personas',
    items: [
      ['👥', PiUsers],
      ['👤', PiUser],
      ['👨', PiUser],
      ['👨‍💼', PiBriefcase],
      ['👨‍🌾', PiPlant],
      ['👨‍⚕️', PiStethoscope],
      ['👑', PiCrown],
      ['🎭', PiMaskHappy],
    ],
  },
  {
    title: 'Tiempo y avisos',
    items: [
      ['⏰', PiAlarm],
      ['📅', PiCalendarBlank],
      ['📆', PiCalendar],
      ['🗓️', PiCalendarDots],
      ['🗓', PiCalendarDots],
      ['🔔', PiBell],
      ['📣', PiMegaphone],
      ['📡', PiBroadcast],
      ['💬', PiChatCircle],
      ['✉️', PiEnvelopeSimple],
      ['📧', PiEnvelopeSimple],
      ['🌅', PiSunHorizon],
      ['☀️', PiSun],
      ['🌙', PiMoon],
    ],
  },
  {
    title: 'Estado y acciones',
    items: [
      ['✅', PiCheckCircle],
      ['✓', PiCheck],
      ['☑', PiCheckSquare],
      ['☐', PiSquare],
      ['❌', PiXCircle],
      ['✕', PiX],
      ['❓', PiQuestion],
      ['⚠️', PiWarning],
      ['🚨', PiSiren],
      ['🚧', PiTrafficCone],
      ['🛡️', PiShieldCheck],
      ['🔒', PiLock],
      ['⚙️', PiGear],
      ['＋', PiPlus],
      ['➕', PiPlus],
      ['🗑️', PiTrash],
      ['🔄', PiArrowsClockwise],
      ['♻️', PiRecycle],
      ['🔀', PiShuffle],
      ['⇄', PiArrowsLeftRight],
      ['↔', PiArrowsHorizontal],
      ['↶', PiArrowCounterClockwise],
      ['📘', PiBookOpen],
      ['✨', PiSparkle],
      ['⭐', PiStar],
      ['💡', PiLightbulb],
      ['🎨', PiPalette],
      ['🚀', PiRocketLaunch],
      ['🎉', PiConfetti],
      ['⚡', PiLightning],
    ],
  },
  {
    title: 'Semáforo',
    items: [
      ['🟢', DotGreen],
      ['🟡', DotYellow],
      ['🔴', DotRed],
    ],
  },
]

export const EMOJI_ICONS: Record<string, IconType> = Object.fromEntries(
  EMOJI_ICON_GROUPS.flatMap((group) => group.items),
)

// Variation selector (U+FE0F) que algunos emojis traen o no
const normalize = (emoji: string) => emoji.replace(/\uFE0F/g, '')
const NORMALIZED: Record<string, IconType> = Object.fromEntries(
  Object.entries(EMOJI_ICONS).map(([emoji, icon]) => [normalize(emoji), icon]),
)

export const getEmojiIcon = (emoji?: string | null): IconType | undefined =>
  emoji ? NORMALIZED[normalize(emoji.trim())] : undefined

const LEADING_EMOJI =
  /^\s*((?:\p{Extended_Pictographic}|[\u2190-\u21FF\u2600-\u27BF\uFF0B])\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u

/** Separa el emoji inicial de un label: '🐄 Animales' → { emoji: '🐄', text: 'Animales' } */
export const splitLeadingEmoji = (label: string): { emoji: string | null; text: string } => {
  const match = label.match(LEADING_EMOJI)
  if (!match) return { emoji: null, text: label }
  return { emoji: match[1], text: label.slice(match[0].length) }
}

/** Quita el emoji inicial (para <option>, que no admite iconos) */
export const stripLeadingEmoji = (label: string) => splitLeadingEmoji(label).text

type EmojiIconProps = {
  emoji?: string | null
  className?: string
  /** Texto accesible; sin él el icono es decorativo */
  title?: string
}

/**
 * Dibuja el icono Phosphor equivalente a un emoji. Si no hay equivalente muestra el emoji
 * tal cual, para no perder información.
 */
export const EmojiIcon = ({ emoji, className = 'h-[1.1em] w-[1.1em]', title }: EmojiIconProps) => {
  if (!emoji) return null
  const Icon = getEmojiIcon(emoji)
  if (!Icon) {
    return (
      <span className={className} aria-hidden={title ? undefined : true} title={title}>
        {emoji}
      </span>
    )
  }
  return <Icon className={`inline-block shrink-0 align-[-0.15em] ${className}`} title={title} />
}

/** Label con su emoji inicial convertido a icono */
export const IconLabel = ({
  label,
  iconClassName = 'h-[1.1em] w-[1.1em]',
  className = '',
}: {
  label: ReactNode
  iconClassName?: string
  className?: string
}) => {
  if (typeof label !== 'string') return <>{label}</>
  const { emoji, text } = splitLeadingEmoji(label)
  if (!emoji) return <>{label}</>
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <EmojiIcon emoji={emoji} className={iconClassName} />
      <span>{text}</span>
    </span>
  )
}
