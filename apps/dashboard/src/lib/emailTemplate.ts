const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.migranja.app'

const LOGO_URL = `${APP_URL}/logo/logo-migranja-verde.png`

/**
 * Template base para todos los emails de Mi Granja
 */
export function emailTemplate({
  title,
  body,
  ctaText,
  ctaUrl,
  secondaryCtaText,
  secondaryCtaUrl,
  footer,
}: {
  title: string
  body: string
  ctaText?: string
  ctaUrl?: string
  secondaryCtaText?: string
  secondaryCtaUrl?: string
  footer?: string
}): string {
  const ctaButton = ctaText && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin-right:8px;">${ctaText}</a>`
    : ''

  const secondaryButton = secondaryCtaText && secondaryCtaUrl
    ? `<a href="${secondaryCtaUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${secondaryCtaText}</a>`
    : ''

  const buttons = (ctaButton || secondaryButton)
    ? `<div style="margin:28px 0 24px 0;text-align:center;">${ctaButton}${secondaryButton}</div>`
    : ''

  const footerHtml = footer
    ? `<p style="font-size:12px;color:#9ca3af;margin:8px 0 0 0;">${footer}</p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="background:#16a34a;border-radius:12px 12px 0 0;padding:28px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="Mi Granja" width="48" height="48" style="display:inline-block;vertical-align:middle;border-radius:8px;" />
      <span style="display:inline-block;vertical-align:middle;margin-left:12px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Mi Granja App</span>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <h2 style="color:#111827;font-size:20px;font-weight:600;margin:0 0 16px 0;">${title}</h2>
      <div style="color:#374151;font-size:15px;line-height:1.6;">
        ${body}
      </div>
      ${buttons}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 24px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
      ${footerHtml}
      <p style="font-size:11px;color:#9ca3af;margin:8px 0 0 0;">
        <a href="${APP_URL}" style="color:#16a34a;text-decoration:none;">migranja.app</a> — Gestion ganadera simplificada
      </p>
    </div>
  </div>
</body>
</html>`
}

export { APP_URL }
