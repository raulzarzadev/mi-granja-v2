'use client'

import { type CSSProperties, useEffect, useState } from 'react'

// Mobile browsers can keep a layout viewport larger than the visible area.
// Anchor navigation and floating actions to the visible viewport instead.
export function useFixedViewport(enabled = true): CSSProperties {
  const [bounds, setBounds] = useState<CSSProperties>({})
  useEffect(() => {
    if (!enabled) return
    const viewport = window.visualViewport
    const update = () => {
      if (!viewport) return
      setBounds({
        '--fixed-top-inset': `${viewport.offsetTop}px`,
        '--fixed-visible-height': `${viewport.height}px`,
        '--fixed-bottom-edge': `${viewport.offsetTop + viewport.height}px`,
        '--fixed-left-inset': `${viewport.offsetLeft}px`,
        '--fixed-visible-width': `${viewport.width}px`,
      } as CSSProperties)
    }
    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [enabled])
  return bounds
}
