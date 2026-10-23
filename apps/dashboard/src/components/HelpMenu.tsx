'use client'

import { WHATSAPP_COMMUNITY_URL } from '@mi-granja/shared'
import React, { useEffect, useRef, useState } from 'react'

const FEEDBACK_EMAIL = 'hola@migranja.app'

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

type HelpMenuProps = {
  onShowGuide: () => void
}

/**
 * Botón de ayuda del navbar: guía, comunidad y sugerencias
 */
const HelpMenu: React.FC<HelpMenuProps> = ({ onShowGuide }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const itemClass =
    'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer'

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ayuda"
        title="Ayuda"
        className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
      >
        <span className="text-base font-bold leading-none" aria-hidden="true">
          ?
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/10"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              onShowGuide()
            }}
          >
            <span aria-hidden="true">📘</span> Primeros pasos
          </button>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
            data-ph-event="cta_click"
            data-ph-location="navbar_help_whatsapp"
            data-ph-label="Comunidad WhatsApp"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" /> Únete a la comunidad
          </a>
          <a
            href={`mailto:${FEEDBACK_EMAIL}?subject=Feedback%20Mi%20Granja`}
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">✉️</span> Enviar sugerencias
          </a>
        </div>
      )}
    </div>
  )
}

export default HelpMenu
