'use client'

import Image from 'next/image'
import React from 'react'

type BrandLogoProps = {
  variant?: 'verde' | 'blanco' | 'negro'
  width?: number
  height?: number
  className?: string
  alt?: string
}

const paths: Record<'verde' | 'blanco' | 'negro', string> = {
  verde: '/logo/logo-migranja-verde.svg',
  blanco: '/logo/logo-migranja-blanco.svg',
  negro: '/logo/logo-migranja-negro.svg',
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'verde',
  width = 180,
  height = 48,
  className,
  alt,
}) => {
  const src = paths[variant]
  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt={alt || `Mi Granja - Logo ${variant}`}
      className={className}
      priority
    />
  )
}

export default BrandLogo
