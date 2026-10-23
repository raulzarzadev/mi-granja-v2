'use client'

import type { ReactNode } from 'react'
import type { IconBaseProps, IconType } from 'react-icons'

/**
 * Iconos que Phosphor no trae (especies, personas, biberón), dibujados en su mismo estilo "regular":
 * viewBox 256, trazo 16, extremos redondeados. Se usan igual que un icono de react-icons.
 */
const farmIcon = (body: ReactNode, displayName: string): IconType => {
  const Component = ({ size = '1em', color, title, className, style, ...rest }: IconBaseProps) => (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
      style={{ color, ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      {body}
    </svg>
  )
  Component.displayName = displayName
  return Component
}

/** Cerdo */
export const Pig = farmIcon(
  <>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M72 84 L60 40 L108 64" />
      <path d="M184 84 L196 40 L148 64" />
      <ellipse cx="128" cy="136" rx="88" ry="76" />
      <ellipse cx="128" cy="164" rx="36" ry="26" />
    </g>
    <circle cx="116" cy="164" r="8" fill="currentColor" />
    <circle cx="140" cy="164" r="8" fill="currentColor" />
    <circle cx="88" cy="120" r="12" fill="currentColor" />
    <circle cx="168" cy="120" r="12" fill="currentColor" />
  </>,
  'Pig',
)

/** Oveja */
export const Sheep = farmIcon(
  <>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M84 108 a26 26 0 0 1 4 -48 a30 30 0 0 1 40 -20 a30 30 0 0 1 40 20 a26 26 0 0 1 4 48" />
      <path d="M88 100 v60 a40 40 0 0 0 80 0 v-60" />
      <path d="M88 116 C64 120 44 112 28 96 C52 88 72 92 88 104" />
      <path d="M168 116 C192 120 212 112 228 96 C204 88 184 92 168 104" />
      <path d="M120 178 h16" />
    </g>
    <circle cx="110" cy="140" r="12" fill="currentColor" />
    <circle cx="146" cy="140" r="12" fill="currentColor" />
  </>,
  'Sheep',
)

/** Cabra */
export const Goat = farmIcon(
  <>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M104 88 C96 52 72 36 48 40" />
      <path d="M152 88 C160 52 184 36 208 40" />
      <path d="M92 104 L100 176 a28 28 0 0 0 56 0 L164 104 a36 36 0 0 0 -72 0 Z" />
      <path d="M94 118 C72 116 52 124 36 140 C60 146 80 140 96 132" />
      <path d="M162 118 C184 116 204 124 220 140 C196 146 176 140 160 132" />
      <path d="M116 206 L128 236 L140 206" />
    </g>
    <circle cx="112" cy="132" r="11" fill="currentColor" />
    <circle cx="144" cy="132" r="11" fill="currentColor" />
  </>,
  'Goat',
)

/** Gallina */
export const Chicken = farmIcon(
  <>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M96 92 a40 40 0 0 1 72 24 v12 L212 80 C228 120 224 168 196 194 C176 210 152 216 128 216 C84 216 56 184 64 140 Z" />
      <path d="M100 76 C100 52 116 44 128 56 C136 40 156 44 156 64" />
      <path d="M84 108 L52 120 L84 132" />
      <path d="M128 160 C148 184 176 184 196 168" />
      <path d="M112 216 v24 M152 216 v24" />
    </g>
    <circle cx="116" cy="108" r="12" fill="currentColor" />
  </>,
  'Chicken',
)

/** Hombre / macho */
export const Man = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="128" cy="44" r="24" />
    <rect x="92" y="88" width="72" height="88" rx="28" />
    <path d="M112 176 V232 M144 176 V232" />
  </g>,
  'Man',
)

/** Mujer / hembra */
export const Woman = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="128" cy="44" r="24" />
    <path d="M128 88 a24 24 0 0 1 22 15 L180 184 H76 L106 103 A24 24 0 0 1 128 88 Z" />
    <path d="M112 184 V232 M144 184 V232" />
  </g>,
  'Woman',
)

/** Gestante */
export const Pregnant = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="132" cy="44" r="24" />
    <path d="M148 92 V184" />
    <path d="M124 92 C108 100 104 116 110 128 C76 136 72 180 112 184 H148" />
    <path d="M116 184 L112 232 M144 184 L148 232" />
  </g>,
  'Pregnant',
)

/** Biberón (lactancia) */
export const BabyBottle = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <g transform="rotate(-45 128 128)">
      <path d="M108 60 C108 30 148 30 148 60 V72 H108 Z" />
      <path d="M84 72 h88 v28 H84 Z" />
      <path d="M92 100 h72 v96 a20 20 0 0 1 -20 20 h-32 a20 20 0 0 1 -20 -20 Z" />
      <path d="M128 136 h24 M128 168 h24" />
    </g>
  </g>,
  'BabyBottle',
)

/** Biberón tachado (destete) */
export const BabyBottleOff = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <g transform="rotate(-45 128 128)">
      <path d="M108 60 C108 30 148 30 148 60 V72 H108 Z" />
      <path d="M84 72 h88 v28 H84 Z" />
      <path d="M92 100 h72 v96 a20 20 0 0 1 -20 20 h-32 a20 20 0 0 1 -20 -20 Z" />
      <path d="M128 136 h24 M128 168 h24" />
    </g>
    <path d="M212 44 L44 212" />
  </g>,
  'BabyBottleOff',
)

/**
 * Filete (engorda / carne). Geometría adaptada de Lucide "beef" (ISC), escalada
 * a la grilla 256 con el mismo grosor de trazo que Phosphor.
 */
export const Steak = farmIcon(
  <g
    transform="scale(10.6667)"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3" />
    <path d="m18.5 6l1.754 3.5a6.48 6.48 0 0 1-1.854 8.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5" />
    <circle cx="12.5" cy="8.5" r="2.5" />
  </g>,
  'Steak',
)

/** Bolsa de sangre (salud / médico) */
export const BloodBag = farmIcon(
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M88 52 V36 a8 8 0 0 1 8 -8 h32 a8 8 0 0 1 8 8 V52" />
    <rect x="48" y="52" width="128" height="136" rx="24" />
    <path d="M48 116 C72 100 96 132 120 116 C144 102 160 108 176 116" />
    <path d="M112 188 V204 C112 236 156 240 188 228 C212 218 224 196 228 172" />
  </g>,
  'BloodBag',
)

/** Ternero recién nacido (parto) */
export const Calf = farmIcon(
  <>
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M80 148 V112 C80 86 98 72 120 72 C142 72 160 86 160 112 V148" />
      <path d="M80 116 C60 120 40 112 28 100 C44 92 64 94 82 104" />
      <path d="M160 116 C180 120 200 112 212 100 C196 92 176 94 158 104" />
      <rect x="72" y="148" width="96" height="60" rx="30" />
      <path d="M188 52 L196 32 M204 68 L224 60 M176 44 V24" />
    </g>
    <circle cx="104" cy="120" r="10" fill="currentColor" />
    <circle cx="136" cy="120" r="10" fill="currentColor" />
    <circle cx="104" cy="178" r="8" fill="currentColor" />
    <circle cx="136" cy="178" r="8" fill="currentColor" />
  </>,
  'Calf',
)
