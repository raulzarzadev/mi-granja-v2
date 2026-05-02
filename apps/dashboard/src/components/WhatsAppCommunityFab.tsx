'use client'

import { WHATSAPP_COMMUNITY_URL } from '@mi-granja/shared'
import { useLocalPreference } from '@/hooks/useLocalPreference'

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

export default function WhatsAppCommunityFab() {
  const [hidden, setHidden] = useLocalPreference('wa_fab_hidden', false)
  const [minimized, setMinimized] = useLocalPreference('wa_fab_minimized', false)

  if (hidden) return null

  if (minimized) {
    return (
      <a
        href={WHATSAPP_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Comunidad WhatsApp"
        title="Comunidad WhatsApp · click derecho para ocultar"
        onContextMenu={(e) => {
          e.preventDefault()
          setHidden(true)
        }}
        className="fixed bottom-3 right-3 z-40 inline-flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#1da851] text-white shadow-lg ring-1 ring-black/10 h-9 w-9 transition-all cursor-pointer print:hidden"
        data-ph-event="cta_click"
        data-ph-location="dashboard_fab_whatsapp_min"
        data-ph-label="Comunidad WhatsApp (mini)"
      >
        <WhatsAppIcon className="h-5 w-5" />
      </a>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      <div className="relative inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1da851] text-white font-semibold shadow-2xl ring-1 ring-black/10 transition-all">
        <a
          href={WHATSAPP_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Únete a la comunidad de WhatsApp para soporte y propuestas"
          title="Comunidad de Mi Granja en WhatsApp · soporte, reportes y propuestas"
          className="inline-flex items-center gap-2 pl-4 pr-3 py-3 rounded-full cursor-pointer"
          data-ph-event="cta_click"
          data-ph-location="dashboard_fab_whatsapp"
          data-ph-label="Comunidad WhatsApp"
        >
          <WhatsAppIcon className="h-6 w-6 shrink-0" />
          <span className="hidden sm:flex flex-col leading-tight text-left">
            <span className="text-sm font-bold">Comunidad WhatsApp</span>
            <span className="text-[11px] font-normal opacity-90">Soporte y propuestas</span>
          </span>
        </a>
        <div className="flex items-center gap-1 pr-2 border-l border-white/30 ml-1 pl-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimizar"
            title="Minimizar"
            className="rounded-full hover:bg-white/20 p-1 cursor-pointer transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Ocultar"
            title="Ocultar"
            className="rounded-full hover:bg-white/20 p-1 cursor-pointer transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
