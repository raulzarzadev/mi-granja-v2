'use client'

import { type TextareaHTMLAttributes, useLayoutEffect, useRef } from 'react'

export default function AutoGrowTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const input = ref.current
    if (!input) return
    const resize = () => {
      if (!input.clientWidth) return
      input.style.height = 'auto'
      input.style.height = `${input.scrollHeight + input.offsetHeight - input.clientHeight}px`
    }
    resize()
    let width = input.clientWidth
    const observer = new ResizeObserver(() => {
      if (width !== input.clientWidth) {
        width = input.clientWidth
        resize()
      }
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [props.value])
  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      style={{ ...props.style, resize: 'none', overflowY: 'hidden' }}
    />
  )
}
