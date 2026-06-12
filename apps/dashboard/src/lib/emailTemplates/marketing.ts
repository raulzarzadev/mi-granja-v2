import { APP_URL, emailTemplate } from '@/lib/emailTemplate'

export type MarketingEmailTemplate = 'basic' | 'app_updates'

export interface MarketingEmailData {
  subject: string
  message: string
  ctaText?: string
  ctaUrl?: string
  unsubscribeUrl?: string
}

export interface BuiltMarketingEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function plainTextToParagraphs(message: string): string {
  return message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px 0;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`,
    )
    .join('')
}

function parseUpdateItems(message: string): { intro: string; items: string[] } {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const items = lines
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, '').trim())

  const introLines = lines.filter((line) => !/^[-*•]\s+/.test(line))

  return {
    intro:
      introLines.join('\n') ||
      'Tenemos nuevas mejoras disponibles para que administres tu granja con menos trabajo manual.',
    items,
  }
}

function buildText(data: MarketingEmailData): string {
  return [
    data.subject,
    '',
    data.message,
    data.ctaText && data.ctaUrl ? ['', `${data.ctaText}: ${data.ctaUrl}`].join('\n') : '',
    data.unsubscribeUrl
      ? ['', `Dejar de recibir novedades: ${data.unsubscribeUrl}`].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildBasicMarketingEmail(data: MarketingEmailData): BuiltMarketingEmail {
  return {
    subject: data.subject,
    text: buildText(data),
    html: emailTemplate({
      title: escapeHtml(data.subject),
      body: plainTextToParagraphs(data.message),
      ctaText: data.ctaText,
      ctaUrl: data.ctaUrl,
      footer: data.unsubscribeUrl
        ? `Recibes este correo porque tienes una cuenta en Mi Granja. <a href="${data.unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Dejar de recibir novedades</a>.`
        : 'Recibes este correo porque tienes una cuenta en Mi Granja.',
    }),
  }
}

export function buildAppUpdatesEmail(data: MarketingEmailData): BuiltMarketingEmail {
  const updates = parseUpdateItems(data.message)
  const updateList =
    updates.items.length > 0
      ? `<div style="margin:20px 0;border:1px solid #dcfce7;border-radius:10px;overflow:hidden;">
          ${updates.items
            .map(
              (item) => `
                <div style="padding:14px 16px;border-bottom:1px solid #dcfce7;background:#f0fdf4;">
                  <div style="font-weight:600;color:#166534;margin-bottom:4px;">Mejora disponible</div>
                  <div style="color:#374151;">${escapeHtml(item)}</div>
                </div>
              `,
            )
            .join('')}
        </div>`
      : ''

  return {
    subject: data.subject || 'Nuevas actualizaciones en Mi Granja',
    text: buildText(data),
    html: emailTemplate({
      title: escapeHtml(data.subject || 'Nuevas actualizaciones en Mi Granja'),
      body: `
        <p style="margin:0 0 14px 0;">Hola,</p>
        ${plainTextToParagraphs(updates.intro)}
        ${updateList}
        <p style="margin:16px 0 0 0;color:#4b5563;">
          Estas mejoras ya están disponibles en tu cuenta. Entra a Mi Granja para revisarlas y seguir trabajando con tus animales, recordatorios y granjas desde el mismo lugar.
        </p>
      `,
      ctaText: data.ctaText || 'Ver actualizaciones',
      ctaUrl: data.ctaUrl || APP_URL,
      footer: data.unsubscribeUrl
        ? `Recibes este correo porque tienes una cuenta en Mi Granja. <a href="${data.unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Dejar de recibir novedades</a>.`
        : 'Recibes este correo porque tienes una cuenta en Mi Granja.',
    }),
  }
}

export function buildMarketingEmail(
  template: MarketingEmailTemplate,
  data: MarketingEmailData,
): BuiltMarketingEmail {
  if (template === 'app_updates') return buildAppUpdatesEmail(data)
  return buildBasicMarketingEmail(data)
}
