# Mi Granja — SEO Action Plan

**Score actual: 62/100 → objetivo próximo trimestre: 85/100**

Cada tarea incluye archivo, acción concreta y estimado de impacto.

---

## 🔴 Critical (arreglar ya — 1 PR pequeño, alto impacto)

### C1. Restaurar acentos y signos `¿?` en todo el landing
**Impacto:** Alto — relevancia en queries en español, FAQ schema matching, percepción de calidad.
**Archivos:**
- `apps/landing/src/components/Benefits.astro` — "Por que" → "Por qué"
- `apps/landing/src/components/Features.astro` — "Control de Reproduccion" → "Control de Reproducción", "Gestion de Colaboradores" → "Gestión de Colaboradores", "Historial de Salud" ya está bien
- `apps/landing/src/components/FAQ.astro` — revisar cada pregunta: "Cuanto cuesta" → "¿Cuánto cuesta?", "Que tipos" → "¿Qué tipos?", "Como funciona" → "¿Cómo funciona?", etc.
- `apps/landing/src/components/Hero.astro` — "Gestiona tu granja de forma\ninteligente" — remover `\n` literal si existe
- `apps/landing/src/components/HowItWorks.astro` — "Gestiona y colabora" OK, revisar títulos
- `apps/landing/src/components/Pricing.astro` — revisar
- `apps/landing/src/components/AnimalTypes.astro` — revisar
- `apps/landing/src/components/CTA.astro` — revisar
- `apps/landing/src/components/Footer.astro` — revisar

También actualizar el JSON-LD `FAQPage` para que las `name` de cada `Question` estén con signos y acentos correctos (se genera desde el componente FAQ.astro — verificar el template).

### C2. Alinear canonical con URL canónica real (resolver apex↔www)
**Impacto:** Alto — consolida señales de ranking.
**Decisión**: elegir `www.migranja.app` (ya es a dónde redirige Vercel) o `migranja.app` (sin www).

Recomendado: **con www** (ya funciona así).

Cambios:
1. `apps/landing/src/layouts/*.astro` (o donde se genere `<link rel="canonical">`) — apuntar a `https://www.migranja.app/`
2. `apps/landing/public/robots.txt` — `Sitemap: https://www.migranja.app/sitemap-index.xml`
3. `sitemap` generation — usar `site: 'https://www.migranja.app'` en `astro.config.mjs`
4. OG tags (`og:url`, `twitter:*`) → con www
5. Schema.org JSON-LD `url` → con www
6. Cambiar el redirect de Vercel de **307 → 301** (permanente). En `apps/landing/vercel.json`:
   ```json
   { "redirects": [{ "source": "/:path*", "has": [{"type":"host","value":"migranja.app"}], "destination": "https://www.migranja.app/:path*", "permanent": true }] }
   ```

### C3. Crear og-image real (1200×630)
**Impacto:** Alto — CTR en shares sociales, WhatsApp, LinkedIn.
**Acción:**
1. Diseñar `og-image.png` (1200×630) con: logo + título "Software ganadero en español" + 3 íconos de especies. Herramienta: Figma / Canva / `@vercel/og`.
2. Guardar en `apps/landing/public/og-image.png`.
3. Actualizar `og:image`, `twitter:image`, y agregar `og:image:width=1200` `og:image:height=630`.
4. Idealmente generar dinámica con `@vercel/og` para poder variar por página en el futuro.

### C4. Añadir analytics (SEO measurement — tarea del board)
**Impacto:** Crítico para poder medir todo lo demás.
**Opción recomendada:** Vercel Analytics (Free tier generoso + Web Vitals de campo).
```bash
pnpm --filter landing add @vercel/analytics @vercel/speed-insights
```
Integrar en el layout principal del landing (Astro integration o script tag).

Alternativa gratuita y privacy-friendly: **Plausible** self-hosted o **Umami**.

Además:
- Configurar **Google Search Console** y verificar `www.migranja.app`.
- Subir el sitemap en Search Console.
- Configurar **Bing Webmaster Tools** (para Perplexity + ChatGPT Search que usan Bing).

---

## 🟠 High (dentro de 1 semana)

### H1. Crear páginas por especie
Genera 9 URLs indexables: `/especies/vacas`, `/especies/ovejas`, `/especies/cabras`, `/especies/cerdos`, `/especies/gallinas`, `/especies/equinos`, `/especies/perros`, `/especies/gatos`, `/especies/otros`.

Cada página con:
- H1 con especie + propuesta de valor
- 600-1000 palabras sobre cómo Mi Granja ayuda para esa especie
- Features específicas (ej. para vacas: gestación 283 días, servicio, parto, calidad de leche)
- Testimonios / capturas específicas
- Schema `WebPage` + `Product` variante
- Internal link desde homepage

**Archivo:** crear `apps/landing/src/pages/especies/[especie].astro` con datos en frontmatter o collection.

### H2. Crear páginas legales
- `/privacidad` (requerido por GDPR/LFPDPPP MX)
- `/terminos`
- `/cookies` (si se añade analytics)

Sin estas, no sólo es legal-risk, también E-E-A-T.

### H3. Crear `/contacto` con formulario real
No solo `mailto:`. Formulario con react-hook-form (ya usado en dashboard) + Brevo API (ya configurada) + schema `ContactPage`.

### H4. Añadir screenshots reales del dashboard a la landing
Mínimo 4 imágenes:
1. Dashboard principal (lista de animales)
2. Ficha de animal con reproducción
3. Calendario de reminders
4. Vista de colaboradores

Formato: WebP, dimensiones 2x para retina, `loading="lazy"` excepto el primero, `alt` descriptivos.

### H5. Security headers
En `apps/landing/vercel.json`:
```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      {"key": "X-Content-Type-Options", "value": "nosniff"},
      {"key": "X-Frame-Options", "value": "DENY"},
      {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
      {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"}
    ]
  }]
}
```

### H6. Sitemap con todas las páginas
Instalar `@astrojs/sitemap` si no está:
```bash
pnpm --filter landing add @astrojs/sitemap
```
Config en `astro.config.mjs`:
```js
import sitemap from '@astrojs/sitemap'
export default defineConfig({
  site: 'https://www.migranja.app',
  integrations: [sitemap()]
})
```
Esto regenera el sitemap cada build con todas las páginas estáticas del Astro router.

### H7. Alinear redirect Vercel 307 → 301
Ver C2 arriba. 307 es temporal; 301 transfiere señales SEO.

---

## 🟡 Medium (dentro de 1 mes)

### M1. Blog técnico (content marketing)
Crear `/blog` y publicar al menos 6 posts pilar:
- "Cómo calcular la fecha de parto en vacas" (query volume alto, informational)
- "Ciclo reproductivo de la oveja: guía completa 2026"
- "Registro sanitario ganadero: obligaciones en México"
- "¿Cuánto cuesta un software ganadero en México?" (commercial intent)
- "Mejor app para control de reproducción ovina"
- "Plantilla Excel gratis: control de ganado (y por qué conviene migrar a software)"

Cada post: 1500-2500 palabras, imágenes, FAQ al final, schema `Article`, author real.

Usar Astro content collections (`src/content/blog/`) + `getCollection()`.

### M2. Comparativas / vs pages
- `/mi-granja-vs-excel`
- `/alternativa-a-agworld` (o el competidor local)
- `/software-ganadero-gratis`

Usar el skill `seo-competitor-pages` para el layout.

### M3. Schema enrichments
- `SoftwareApplication` → agregar `aggregateRating` cuando tengan ≥5 reviews, `screenshot`, `softwareVersion`, `author: Organization`
- `Organization` → agregar `sameAs` (Twitter, LinkedIn, YouTube, Facebook si existen), `contactPoint`, `foundingDate`
- `BreadcrumbList` en todas las páginas hijas
- `Product` + `Offer` para Plan Pro (MXN 250/mes por place)

### M4. `llms.txt` para AI crawlers
Crear `apps/landing/public/llms.txt`:
```
# Mi Granja — Software de gestión ganadera

> Mi Granja es un SaaS en español para gestionar animales, reproducción, salud y colaboradores en granjas de cualquier tamaño. Plan gratuito con 1 granja. Plan Pro con "lugares" flexibles para granjas/colaboradores adicionales.

## Documentación
- [Cómo empezar](https://www.migranja.app/docs/empezar)
- [Guía de reproducción](https://www.migranja.app/blog/guia-reproduccion)

## Especies soportadas
- Vacas, ovejas, cabras, cerdos, gallinas, equinos, perros, gatos

## Contacto
- Email: hola@migranja.app
```

### M5. Internacionalización preparada (futuro)
Añadir `<link rel="alternate" hreflang="es-MX" href="..."/>` y `hreflang="x-default"`. Preparar estructura para `/en/` cuando decidan expandirse.

### M6. Optimizar JSON-LD FAQPage con datos reales
Actualmente tiene 6 preguntas — expandir a 12-15 cubriendo:
- ¿Mi Granja funciona sin internet? (offline/PWA)
- ¿Puedo importar mis animales desde Excel?
- ¿Cómo exporto mis datos?
- ¿Soporta bovinos lecheros y de engorda?
- ¿Tiene app móvil?
- ¿Es seguro guardar mis datos ahí? (GDPR, Firebase)

---

## 🟢 Low (backlog)

### L1. PWA / instalable
Añadir `manifest.json` + service worker para que el landing sea instalable. Señal menor pero bueno para experiencia.

### L2. Video demo en hero
Video de 45s mostrando el flujo. Alojado en YouTube (para aprovechar YouTube SEO también) + embed.

### L3. Localized pricing
Mostrar precios en USD/MXN según geo. Schema `Offer` múltiple.

### L4. Review schema (cuando haya testimonios)
Recopilar 10+ reviews reales y agregar `aggregateRating` al `SoftwareApplication` schema.

### L5. Knowledge graph / Wikipedia / Wikidata entry
Cuando haya 12+ meses de tracción, crear entrada en Wikidata. Boost notable para "Mi Granja" como entidad nombrada.

---

## Dashboard app — recordatorio
Verificar que `dashboard.migranja.app` tiene `robots.txt` con `Disallow: /` (no debe estar en el funnel orgánico).

```
User-agent: *
Disallow: /
```

Archivo: `apps/dashboard/public/robots.txt` — si no existe, crearlo.

---

## Milestone suggerido

**Sprint 1 (ahora):** C1, C2, C3, C4, H5, H7 — 1 PR "seo-quick-wins"
**Sprint 2:** H1, H2, H3, H4, H6 — crecimiento de surface area
**Sprint 3:** M1 (primeros 3 posts del blog), M3, M4
**Continuo:** M1 (publicar 1 post/semana)

Con Sprint 1 + 2 el score debería subir de **62 → ~80**. Con blog consistente (M1) y schema enriquecido (M3), **80 → 88+** en 3 meses.
