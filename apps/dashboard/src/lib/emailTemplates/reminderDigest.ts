import type { Reminder } from '@/types'

const PRIORITY_LABEL: Record<Reminder['priority'], string> = {
  high: '🔴 Alta',
  medium: '🟡 Media',
  low: '🟢 Baja',
}

const TYPE_LABEL: Record<Reminder['type'], string> = {
  medical: 'Salud',
  breeding: 'Reproducción',
  feeding: 'Alimentación',
  weight: 'Peso',
  other: 'Otro',
}

interface DigestData {
  userName: string
  today: Reminder[]
  overdue: Reminder[]
  upcoming: Reminder[]
  appUrl: string
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function renderItem(r: Reminder): string {
  const animals = r.animalNumbers?.length
    ? `<span style="color:#666">· ${r.animalNumbers.length} animal${r.animalNumbers.length > 1 ? 'es' : ''}</span>`
    : ''
  return `
    <li style="padding:10px 0;border-bottom:1px solid #eee">
      <div style="font-weight:600;color:#1a1a1a">${escapeHtml(r.title)} ${animals}</div>
      <div style="font-size:13px;color:#666;margin-top:2px">
        ${PRIORITY_LABEL[r.priority]} · ${TYPE_LABEL[r.type]} · ${formatDate(r.dueDate)}
      </div>
      ${r.description ? `<div style="font-size:13px;color:#444;margin-top:4px">${escapeHtml(r.description)}</div>` : ''}
    </li>`
}

function renderSection(title: string, items: Reminder[], color: string): string {
  if (items.length === 0) return ''
  return `
    <h3 style="color:${color};margin:24px 0 8px;font-size:16px">
      ${title} (${items.length})
    </h3>
    <ul style="list-style:none;padding:0;margin:0">
      ${items.map(renderItem).join('')}
    </ul>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildReminderDigestEmail(data: DigestData): {
  subject: string
  html: string
} {
  const total = data.today.length + data.overdue.length + data.upcoming.length
  const subject =
    data.overdue.length > 0
      ? `Mi Granja: ${data.overdue.length} recordatorio${data.overdue.length > 1 ? 's' : ''} atrasado${data.overdue.length > 1 ? 's' : ''}`
      : `Mi Granja: ${data.today.length} recordatorio${data.today.length !== 1 ? 's' : ''} hoy`

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:24px">
      <h1 style="margin:0;font-size:20px">🌾 Mi Granja</h1>
      <p style="margin:4px 0 0;opacity:.9;font-size:14px">Resumen de recordatorios</p>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;color:#1a1a1a">
        Hola ${escapeHtml(data.userName)}, tienes <strong>${total}</strong> recordatorio${total !== 1 ? 's' : ''} que requieren tu atención.
      </p>

      ${renderSection('⚠️ Atrasados', data.overdue, '#dc2626')}
      ${renderSection('📅 Para hoy', data.today, '#16a34a')}
      ${renderSection('🗓 Próximos 3 días', data.upcoming, '#2563eb')}

      <div style="margin-top:32px;text-align:center">
        <a href="${data.appUrl}/recordatorios"
           style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Ver en Mi Granja
        </a>
      </div>
    </div>
    <div style="background:#fafafa;padding:16px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee">
      Recibes este correo porque tienes activadas las notificaciones por email.
      <br><a href="${data.appUrl}/perfil" style="color:#666">Cambiar preferencias</a>
    </div>
  </div>
</body>
</html>`

  return { subject, html }
}
