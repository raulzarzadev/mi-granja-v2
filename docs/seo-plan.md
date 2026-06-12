# Plan SEO — Mi Granja (migranja.app)

> Creado: 2026-06-11. Estado del sitio al crear el plan: landing Astro con 2 páginas (`/` y `/prices`), base técnica sólida, sin contenido editorial.

## Diagnóstico actual

### Lo que ya está bien ✅
- Canonical forzado a `https://www.migranja.app` en `Layout.astro`
- Meta description, Open Graph, Twitter Cards, theme-color
- JSON-LD: `SoftwareApplication` (con featureList y Offer) + `Organization` en todas las páginas, `FAQPage` en el componente FAQ
- `@astrojs/sitemap` configurado + `robots.txt` apuntando a `sitemap-index.xml`
- Dashboard con `robots: { index: false }` — correcto, la app no compite con el landing
- Sitio estático Astro → Core Web Vitals de partida excelentes

### Gaps principales ❌
1. **Solo 2 páginas indexables** — sin superficie para rankear nada más que la marca
2. **Sin contenido editorial** (blog/guías) — cero tráfico top/middle-of-funnel
3. **Sin páginas por tipo de animal / caso de uso** — `AnimalTypes` es una sección, no páginas
4. **Sin `llms.txt` en el landing** (el del repo es para agentes de código, no para AI search)
5. **Targeting geográfico ambiguo** — `og:locale es_ES` pero precios en MXN; sin estrategia LatAm vs España
6. **Sin medición** — Search Console no confirmado, solo PostHog
7. **Sin página "vs/alternativas"** — las búsquedas de comparación convierten 4-7%

## Keywords objetivo (español, intención)

| Cluster | Ejemplos | Intención |
|---|---|---|
| Genérico producto | software ganadero, app para ganado, programa gestión ganadera | BOFU |
| Por especie | app para control de borregos/ovejas, software para cabras, registro de vacas app | BOFU |
| Tareas | control de empadres, registro de partos, calendario reproductivo ovino, arete/identificación de animales | MOFU |
| Educativo | cuándo destetar borregos, gestación de cabras días, cómo llevar registros ganaderos | TOFU |
| Comparación | alternativas a [competidor], mejores apps ganaderas 2026 | BOFU |

Competidores a analizar (validar con búsquedas reales): AgriWebb, Ganadero SG, Software Ganadero (ABS), Farmbrite, cuadernos de campo regionales.

## Fase 1 — Fundación técnica (semana 1-2, esfuerzo bajo)

- [ ] Verificar propiedad en **Google Search Console** + enviar sitemap; alta en Bing Webmaster Tools
- [ ] Crear `apps/landing/public/llms.txt` describiendo producto, features y pricing (GEO: ChatGPT/Perplexity/AI Overviews)
- [ ] Cambiar `og:locale` a `es_MX` (o decidir mercado primario) y documentar decisión
- [ ] Página 404 propia con links al home
- [ ] Páginas legales (`/privacidad`, `/terminos`) — señal de confianza E-E-A-T y requisito para Google
- [ ] Revisar redirect apex → www (canonical host) en Vercel
- [ ] `alt` descriptivo en todas las imágenes del landing; `loading="lazy"` debajo del fold

## Fase 2 — Superficie de páginas (semana 3-6)

Cada sección actual del index se convierte en página propia enlazada desde el menú/footer:

```
/                          (existente)
/precios                   (renombrar /prices → URL en español, redirect 301)
/funciones                 hub de features
  /funciones/reproduccion  empadres, partos, destetes
  /funciones/recordatorios push + email digest
  /funciones/asistente-ia  diferenciador clave — pocos competidores lo tienen
  /funciones/colaboradores
/ganado/borregos           página por especie (template repetible)
/ganado/cabras
/ganado/vacas
/contacto                  (+ schema ContactPoint)
```

- Template de página por especie: problema → cómo lo resuelve Mi Granja → screenshot → FAQ con schema → CTA. Reutilizable para nuevas especies.
- Interlinking: cada página enlaza a su cluster + a `/precios`.
- Breadcrumbs con `BreadcrumbList` schema.

## Fase 3 — Contenido editorial (semana 7-16)

- [ ] Blog en Astro (content collections) bajo `/blog`
- [ ] Cadencia realista: **2 posts/mes** (solo founder; mejor consistencia que volumen)
- [ ] Primeros 8 temas (mapean a keywords TOFU/MOFU con CTA al producto):
  1. Calendario reproductivo de ovejas: gestación, empadre y destete
  2. Cómo llevar registros ganaderos (papel vs Excel vs app)
  3. Cuándo destetar borregos: edad vs peso
  4. Guía de identificación de animales (aretes, tatuajes)
  5. Control de partos: qué registrar y por qué
  6. Cuántas cabras por semental: ratios de empadre
  7. Checklist sanitario básico para granjas pequeñas
  8. IA en ganadería: qué puede hacer hoy un asistente para tu granja
- [ ] Schema `Article` + autor con bio (E-E-A-T: Raúl como ganadero+desarrollador es señal de experiencia real — explotarla)
- [ ] Página `/sobre-nosotros` con la historia del producto (built by a farmer)

## Fase 4 — Autoridad y GEO (mes 4+)

- [ ] 1-2 páginas de comparación (`/alternativas-a-X` o "mejores apps ganaderas") — alta conversión
- [ ] Testimonios reales de usuarios con nombre/granja en home y páginas de especie
- [ ] Conseguir menciones: foros ganaderos, grupos de Facebook, directorios agro LatAm, YouTube de ganaderos
- [ ] GEO: tablas de precios/features parseables, respuestas citables de 40-60 palabras al inicio de cada sección, verificar acceso de GPTBot/ClaudeBot/PerplexityBot en robots.txt
- [ ] Revisar AI Overviews para keywords objetivo y ajustar

## Medición (KPIs)

| Métrica | Hoy | 3 meses | 6 meses | 12 meses |
|---|---|---|---|---|
| Páginas indexadas | ~2 | 15 | 25 | 40+ |
| Clics orgánicos/mes (GSC) | baseline | +50% | 3× | 10× |
| Keywords en top 20 | ~0 no-marca | 10 | 30 | 80 |
| Registros desde orgánico | medir con PostHog UTM | — | — | — |

Revisión mensual: GSC (queries, coverage) + PostHog (signup por fuente).

## Riesgos / notas

- Mercado de nicho con volumen de búsqueda bajo → cada keyword vale mucho; long-tail por especie es la apuesta
- No sacrificar el dashboard: todo el esfuerzo SEO vive en `apps/landing`
- Mantener todo en español (regla del proyecto); hreflang solo si algún día hay versión en otro idioma
