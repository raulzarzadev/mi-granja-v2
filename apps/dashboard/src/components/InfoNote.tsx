import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaQuestionCircle,
  FaTimesCircle,
} from 'react-icons/fa'

type Variant = 'info' | 'warning' | 'success' | 'error' | 'help'

interface InfoNoteProps {
  children: React.ReactNode
  variant?: Variant
}

const variantStyles: Record<Variant, string> = {
  info: 'text-blue-500 bg-blue-50 border-blue-100',
  warning: 'text-orange-700 bg-orange-50 border-orange-200',
  success: 'text-green-700 bg-green-50 border-green-200',
  error: 'text-red-700 bg-red-50 border-red-200',
  help: 'text-purple-700 bg-purple-50 border-purple-200',
}

const variantIcons: Record<Variant, React.ElementType> = {
  info: FaInfoCircle,
  warning: FaExclamationTriangle,
  success: FaCheckCircle,
  error: FaTimesCircle,
  help: FaQuestionCircle,
}

export default function InfoNote({ children, variant = 'info' }: InfoNoteProps) {
  const IconComponent = variantIcons[variant]
  return (
    <p
      className={`w-full text-xs px-2 py-1.5 rounded border flex gap-1.5 items-center overflow-hidden ${variantStyles[variant]}`}
    >
      <IconComponent className="shrink-0 text-[14px]" />
      <span className="min-w-0 wrap-break-word">{children}</span>
    </p>
  )
}
