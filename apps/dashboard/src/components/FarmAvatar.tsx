'use client'

import React from 'react'

type FarmAvatarProps = {
  name: string
  photoURL?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
} as const

const FarmAvatar: React.FC<FarmAvatarProps> = ({ name, photoURL, size = 'md', className = '' }) => {
  const initial = name?.charAt(0)?.toUpperCase() || 'G'

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-green-200 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold border-2 border-green-200 ${className}`}
    >
      {initial}
    </div>
  )
}

export default FarmAvatar
