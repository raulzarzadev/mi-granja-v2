import React from 'react'
import { Icon, IconName } from '../Icon/icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'icon' | 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'ghost' | 'filled'
  color?: 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'
  children?: React.ReactNode
  icon?: IconName
  iconPosition?: 'left' | 'right'
}

const Button: React.FC<ButtonProps> = ({
  size = 'md',
  variant = 'filled',
  color = 'primary',
  className = '',
  children,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const sizeClasses = {
    icon: 'h-10 w-10 p-0',
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5'
  }

  const variantClasses = {
    filled: 'shadow-sm hover:shadow-md border border-transparent',
    outline: 'border-2 bg-transparent backdrop-blur-sm',
    ghost: 'bg-transparent border border-transparent'
  }

  const colorClasses = {
    primary: {
      filled: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      outline:
        'border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500',
      ghost:
        'text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500'
    },
    error: {
      filled: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline:
        'border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-500',
      ghost:
        'text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-500'
    },
    success: {
      filled: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      outline:
        'border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-green-500',
      ghost:
        'text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-green-500'
    },
    info: {
      filled: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500',
      outline:
        'border-cyan-600 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-cyan-500',
      ghost:
        'text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 focus:ring-cyan-500'
    },
    warning: {
      filled: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
      outline:
        'border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:ring-amber-500',
      ghost:
        'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:ring-amber-500'
    },
    neutral: {
      filled: 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-500',
      outline:
        'border-gray-400 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-500',
      ghost:
        'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500'
    }
  }

  const baseClasses = [
    'font-medium rounded-lg transition-all duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100',
    'inline-flex items-center justify-center',
    'select-none active:scale-95'
  ].join(' ')

  const iconSize =
    size === 'icon' ? 4 : size === 'sm' ? 4 : size === 'md' ? 5 : 6

  const renderContent = () => {
    if (size === 'icon' && icon) {
      return <Icon icon={icon} size={iconSize} />
    }

    if (icon && children) {
      return iconPosition === 'left' ? (
        <>
          <Icon icon={icon} size={iconSize} />
          <span>{children}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <Icon icon={icon} size={iconSize} />
        </>
      )
    }

    if (icon) {
      return <Icon icon={icon} size={iconSize} />
    }

    return children
  }

  const classes = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    colorClasses[color][variant],
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {renderContent()}
    </button>
  )
}

export default Button
