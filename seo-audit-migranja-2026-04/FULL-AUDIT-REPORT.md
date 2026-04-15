# Mi Granja — Full SEO Audit Report

- **Target:** `https://migranja.app` (redirects to `https://www.migranja.app/`)
- **Audit date:** 2026-04-12
- **Business type:** SaaS B2B — Software ganadero (livestock management) en español, mercado MX/LATAM
- **Stack detectado:** Astro 5 + Tailwind v4, hosted on Vercel
- **Pages crawled:** 1 (the sitemap only exposes the homepage; landing is single-page)

---

## Executive Summary

### SEO Health Score: **62 / 100**

| Category             | Weight | Score | Weighted |
|----------------------|:------:|:-----:|:--------:|
| Technical SEO        |  25%   |  78   |   19.5   |
| Content Quality      |  25%   |  48   |   12.0   |
| On-Page SEO          |  20%   |  72   |   14.4   |
| Schema / Structured  |  10%   |  85   |    8.5   |
| Performance (CWV)    |  10%   |  80*  |    8.0   |
| Images               |   5%   |  55   |    2.75  |
| AI Search Readiness  |   5%   |  65   |    3.25  |
| **TOTAL**            | 100%   |       | **≈ 62** |

\* Performance estimated from static signals (39 KB HTML, 26 KB CSS, 0 third-party scripts, Vercel CDN HIT, no JS hydration). A field measurement (Lighthouse/CrUX) was not run in this audit.

### Top 5 Critical Issues

1. **Single-page site indexable** — the sitemap contains only `https://migranja.app/`. The entire value proposition lives in one URL. There is no `/precios`, `/funcionalidades`, `/especies/vacas`, `/blog`, `/contacto`, `/privacidad`, `/terminos`. This eliminates **all** long-tail SEO surface area and breaks intent-based search.
2. **Contenido sin acentos en español** — el HTML servido contiene "Reproduccion", "Gestion", "Por que", "Cuanto", "Que tipos", etc. For Spanish search queries this:
   - Reduces topical relevance vs. correctly-accented competitors.
   - Degrades E-E-A-T signals (looks low quality / auto-translated).
   - Breaks FAQ schema matching in rich results (Google compares against natural-language queries).
3. **No hay og-image dedicada** — `og:image` apunta a `logo-migranja-verde.png` (un logo, no una social card 1200x630). Share previews en WhatsApp/Twitter/LinkedIn se ven rotos/mal recortados, bajando CTR de enlaces compartidos.
4. **No analytics / no medición** — No hay GA4, GTM, Plausible ni Vercel Analytics en el HTML servido. Imposible medir rankings, CTR orgánico, Core Web Vitals de campo, conversiones. Alineado con la tarea pendiente "SEO measurement" del board.
5. **No hay canonical cross-domain ni hreflang** — `migranja.app` redirige 307 a `www.migranja.app` pero el canonical apunta a `https://migranja.app/` (sin www). Google respeta canonical pero el mismatch redirect↔canonical causa wasted crawl budget y debilita señales de consolidación.

### Top 5 Quick Wins

1. **Corregir todos los acentos** en `apps/landing/src/components/*.astro` (Benefits, Features, FAQ, Hero, HowItWorks, Pricing). Es una sola PR de texto.
2. **Alinear canonical con redirect**: cambiar canonical a `https://www.migranja.app/` (o redirigir www→apex) y listo.
3. **Generar og-image 1200x630** con el título y el logo. 30 min de trabajo, gran ganancia de CTR social.
4. **Añadir Vercel Analytics** (`@vercel/analytics/astro`) — 5 líneas, cero costo, habilita CWV de campo + pageviews.
5. **Añadir headers de seguridad** en `apps/landing/vercel.json` o `next.config`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. SEO boost secundario + protección.

---

## Technical SEO (Score: 78 / 100)

### Crawlability

| Check                               | Status    | Notes |
|-------------------------------------|-----------|-------|
| `robots.txt` presente               | ✅ OK     | `User-agent: *` / `Allow: /` |
| Sitemap declarado en robots         | ✅ OK     | `Sitemap: https://migranja.app/sitemap-index.xml` |
| `sitemap-index.xml` válido          | ✅ OK     | Apunta a `sitemap-0.xml` |
| `sitemap.xml` (sin index)           | ❌ 404    | Minor: algunos crawlers prueban este path primero |
| URLs en sitemap                     | ⚠️ 1 sola | Solo homepage; sin cobertura de pricing, features, FAQ separados, legales |
| `noindex` detectado                 | ✅ No     | `<meta robots>` = `index, follow` |
| Canonical presente                  | ⚠️ Parcial| Apunta a apex sin www, pero el servidor redirige apex→www |
| HTTPS / HSTS                        | ✅ OK     | `max-age=63072000` (2 años) |
| HTTP→HTTPS redirect                 | ✅ OK     | vía Vercel |
| Redirect chain                      | ⚠️ 307    | 307 apex→www. Los 307 son "temporary"; para SEO preferir **301 permanente** |

### Indexability

- El robots meta es `index, follow` — correcto.
- El canonical `https://migranja.app/` (sin www) es **distinto** de la URL final servida `https://www.migranja.app/`. Google normalmente sigue al canonical, pero el servidor redirige al canonical declarado hacia otra URL — inconsistencia clásica. **Acción**: elegir una variante (con o sin www) y alinear redirect + canonical.

### Security Headers

Solo **1 de 6** headers de seguridad relevantes:

| Header                       | Estado |
|------------------------------|:------:|
| `Strict-Transport-Security`  | ✅     |
| `X-Content-Type-Options`     | ❌     |
| `X-Frame-Options`            | ❌     |
| `Referrer-Policy`            | ❌     |
| `Permissions-Policy`         | ❌     |
| `Content-Security-Policy`    | ❌     |

### Core Web Vitals (estimación estática)

- **HTML:** 39.9 KB (no comprimido: gzip/br servido por Vercel, más pequeño en red)
- **CSS:** 1 archivo, 26.3 KB (`/_astro/index.DVCfbAqP.css`)
- **Scripts externos:** 0 (Astro sin hydration detectada)
- **Imágenes above-the-fold:** solo el logo SVG (`logo-migranja-verde.svg`)
- **Fuentes externas:** ninguna (estupendo — cero bloqueo de render)
- **CDN:** Vercel edge, `x-vercel-cache: HIT`, `age: 346485` (4 días en cache)

Estimación: **LCP < 1.5 s, CLS ≈ 0, INP < 100 ms** para usuarios con buena red. No medido en campo.

---

## Content Quality (Score: 48 / 100)

### E-E-A-T

| Señal                                        | Estado |
|----------------------------------------------|:------:|
| Autoría identificable (quién/empresa)        | ⚠️ Solo logo + contacto email |
| Página "Sobre nosotros" / About              | ❌     |
| Página de contacto completa                  | ❌ Solo `mailto:hola@migranja.app` |
| Casos de éxito / testimonios reales          | ❌     |
| Experiencia demostrable (screenshots, demo)  | ❌ No hay capturas del producto |
| Páginas legales (privacidad, términos)       | ❌     |
| Datos estructurados Organization con sameAs  | ⚠️ Organization presente, sin `sameAs` a redes sociales |

### Problemas de contenido detectados

1. **Acentos eliminados en todo el sitio** — ejemplos en el HTML servido:
   - "Control de **Reproduccion**" (debería ser "Reproducción")
   - "**Gestion** de Colaboradores" → "Gestión"
   - "**Por que** elegir Mi Granja" → "Por qué"
   - "**Cuanto** cuesta Mi Granja?" → "¿Cuánto cuesta Mi Granja?"
   - "**Que tipos** de animales..." → "¿Qué tipos..."
   - FAQ sin `¿` de apertura
2. **Thin content**: ~921 palabras en una sola página para 9 especies + 6 features + pricing + FAQ. Cada especie merece su propia página (800-1200 palabras c/u): `/especies/vacas`, `/especies/ovejas`, etc.
3. **No hay blog** — zero content marketing. Para un SaaS ganadero, este es el canal #1 de tráfico long-tail ("cómo calcular gestación de vaca", "control de parición en ovejas", "ciclo reproductivo cabras", etc.).
4. **Duplicate content risk**: dashboard.migranja.app no fue auditado pero si está indexado, puede canibalizar.

### Readability

- Lenguaje claro, conciso, directo. Spanish nivel B1 accesible. Bien para el público objetivo.
- Falta un glosario o sección educativa que capture intent informacional.

---

## On-Page SEO (Score: 72 / 100)

### Title & Meta

| Elemento             | Valor | Análisis |
|----------------------|-------|----------|
| `<title>`            | "Mi Granja - Software de Gestión Ganadera \| Control de Animales y Reproducción" | ✅ 82 chars, marca + keyword principal + beneficio |
| `<meta description>` | "Software ganadero en español. Gestiona animales, reproducción, salud, colaboradores y recordatorios desde cualquier dispositivo. Plan gratuito incluido. Para vacas, ovejas, cabras, cerdos y más." | ✅ 196 chars, incluye CTA implícito y especies |
| `<html lang>`        | `es` | ✅ (pero falta `hreflang` o `es-MX` si apunta a México) |
| Open Graph           | 7 tags (type, title, description, url, site_name, image, locale) | ⚠️ Imagen es un logo, no una social card |
| Twitter Card         | 4 tags (card, title, description, image) | ⚠️ Misma imagen |
| Viewport             | `width=device-width, initial-scale=1.0` | ✅ |
| Theme-color          | ✅ | |
| Favicon              | ✅ SVG | |

### Heading Structure

- **H1:** 1 ("Gestiona tu granja de forma inteligente") ✅
- **H2:** 7 (Funcionalidades, Especies, Cómo empezar, Beneficios, Precios, FAQ, CTA final) ✅
- **H3:** 33 (feature names, especies, FAQ questions, pricing items) ✅

Jerarquía limpia. Solo advertencia: el H1 contiene un salto de línea literal `\n` (detalle de plantilla).

### Internal Linking

- **Total links:** 19
- **Internal:** 10 (todos son anchors `#funcionalidades`, `#especies`, `#beneficios`, `#preguntas`, `#precios` o self `/`)
- **External outbound:** 0
- **Subdomain outbound:** `https://panel.migranja.app/auth` (login/signup)

**Problema**: No hay internal links reales — solo anclas dentro de la misma página porque el sitio es single-page. Cuando se creen sub-páginas, implementar linking contextual.

---

## Schema / Structured Data (Score: 85 / 100)

### Tipos presentes (3 bloques JSON-LD)

1. **SoftwareApplication** — ✅ Excelente elección
   - `name`, `applicationCategory: BusinessApplication`, `operatingSystem: Web`
   - `offers` con `price: 0` `priceCurrency: MXN` (refleja plan free)
   - `featureList` con 6 features
   - `inLanguage: es`
   - **Missing**: `aggregateRating` (cuando tengan reseñas), `screenshot`, `softwareVersion`, `author`/`publisher`
2. **Organization** — ✅
   - `name`, `url`, `logo`
   - **Missing**: `sameAs` (Twitter/LinkedIn/FB/YouTube), `contactPoint`, `address`, `foundingDate`
3. **FAQPage** — ✅
   - 6 preguntas en el mainEntity
   - **Problema**: las preguntas sin signos `¿?` ni acentos pierden match con queries reales ("¿cuánto cuesta?")

### Recomendaciones de schema

- Añadir **BreadcrumbList** (cuando existan páginas hijas)
- Añadir **Product** para el Plan Pro (con `priceSpecification` MXN 250/mes)
- Añadir **WebSite** con `SearchAction` si se agrega búsqueda
- Añadir **Review**/`aggregateRating` al tener testimonios reales

---

## Performance (Score estimado: 80 / 100)

Sin medición Lighthouse/CrUX, basado en signals estáticos:

| Métrica                        | Estimación |
|--------------------------------|------------|
| **LCP**                        | < 1.5 s (HTML pequeño, CSS único, sin JS hydration) |
| **CLS**                        | ≈ 0 (imágenes con SVG fijo, sin ads) |
| **INP**                        | < 100 ms (0 scripts externos) |
| TTFB                           | < 300 ms (Vercel edge HIT) |
| Peso total (HTML + CSS)        | ≈ 66 KB descomprimido |

### Oportunidades

- Ninguna imagen `.webp` / `.avif` detectada — no hay fotos todavía, pero cuando se añadan screenshots, servirlas en AVIF con fallback WebP.
- No hay `preload` de recursos críticos (fuente principal, LCP image). Astro suele optimizar CSS inline para crítico — verificar con Lighthouse real.
- No hay fuentes custom → cero bloqueo. Usar `system-ui` stack es perfecto.
- Agregar `loading="lazy"` a imágenes below-the-fold cuando se añadan screenshots.

---

## Images (Score: 55 / 100)

- **Total imágenes en HTML:** 2 (ambas el logo `/logo/logo-migranja-verde.svg` + `/logo/logo-migranja-blanco.svg`)
- **Alt text:** ambos tienen `alt="Mi Granja"` ✅
- **Formatos:** SVG (óptimo)

**Problema crítico**: un SaaS sin **screenshots del producto** en la landing pierde:
- Conversión (usuarios quieren ver la app antes de registrarse)
- Google Images traffic (queries como "software ganadero interfaz")
- Señal de credibilidad / experiencia (E-E-A-T)

**Acción**: añadir 4-6 screenshots reales del dashboard (lista de animales, reproducción, reportes) en formato WebP, con `alt` descriptivo.

---

## AI Search Readiness (Score: 65 / 100)

### Citability signals

- ✅ FAQ en HTML + FAQPage schema — citable por AI Overviews y ChatGPT Search
- ✅ Definiciones directas en headings ("Compatible con múltiples especies")
- ✅ Datos estructurados con precio, features, idioma
- ❌ No `llms.txt` en la raíz (ver spec de Anthropic/OpenAI para facilitar crawling de LLMs)
- ❌ Sin contenido long-form que pueda ser citado como autoridad
- ❌ Sin "author" o "reviewed by" expertos (veterinarios, zootecnistas)
- ❌ Sin sección de casos de uso específicos citables

### Recomendaciones GEO (Generative Engine Optimization)

1. Crear `llms.txt` en `apps/landing/public/` con descripción curada del producto y links a recursos clave.
2. Añadir sección "Para veterinarios / zootecnistas" con lenguaje técnico (aumenta citability en nichos).
3. Publicar al menos 3 guías ancla (pilar content): "Guía de reproducción bovina", "Calendario sanitario ovino", "Control de paternidad en cabras". Cada una con TL;DR, FAQ, datos concretos, fuentes citables.

---

## Dashboard (`dashboard.migranja.app`) — Nota aparte

No auditado en esta corrida porque es una app protegida. Verificar rápidamente:
- Debe tener `robots.txt` con `Disallow: /` (está fuera del funnel orgánico).
- No debe aparecer en el sitemap público.
- Si tiene landing/marketing, mover a `www.migranja.app/docs` o similar.
