'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

interface PersistentVerticalScrollAreaProps {
  children: React.ReactNode
  className?: string
  ariaLabel: string
}

export function PersistentVerticalScrollArea({
  children,
  className = '',
  ariaLabel,
}: PersistentVerticalScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollbar, setScrollbar] = useState({ visible: false, height: 0, offset: 0 })

  const updateScrollbar = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const viewportHeight = viewport.clientHeight
    const maxScrollTop = viewport.scrollHeight - viewportHeight
    if (maxScrollTop <= 0 || viewportHeight === 0) {
      setScrollbar({ visible: false, height: 0, offset: 0 })
      return
    }

    const height = Math.max((viewportHeight / viewport.scrollHeight) * viewportHeight, 32)
    const offset = (viewport.scrollTop / maxScrollTop) * (viewportHeight - height)
    setScrollbar({ visible: true, height, offset })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    updateScrollbar()
    viewport.addEventListener('scroll', updateScrollbar, { passive: true })
    window.addEventListener('resize', updateScrollbar)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollbar) : null
    resizeObserver?.observe(viewport)
    Array.from(viewport.children).forEach((child) => {
      resizeObserver?.observe(child)
    })

    const mutationObserver =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(updateScrollbar) : null
    mutationObserver?.observe(viewport, { childList: true, subtree: true })

    return () => {
      viewport.removeEventListener('scroll', updateScrollbar)
      window.removeEventListener('resize', updateScrollbar)
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    }
  }, [updateScrollbar])

  return (
    <div className={`relative ${className}`}>
      <div
        ref={viewportRef}
        aria-label={ariaLabel}
        tabIndex={0}
        className="persistent-scrollbar-native-hidden h-full overflow-x-hidden overflow-y-auto overscroll-contain pr-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
      >
        {children}
      </div>
      {scrollbar.visible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-2 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="w-full rounded-full bg-slate-500"
            style={{ height: scrollbar.height, transform: `translateY(${scrollbar.offset}px)` }}
          />
        </div>
      ) : null}
    </div>
  )
}
