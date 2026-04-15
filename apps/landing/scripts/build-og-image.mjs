#!/usr/bin/env node
/**
 * Rasterizes public/og-image.svg to public/og-image.png at 1200x630.
 * Uses sharp (already provided by Astro 5's image service).
 * Runs automatically before `astro build` via the package.json prebuild hook.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const svgPath = join(publicDir, 'og-image.svg')
const pngPath = join(publicDir, 'og-image.png')

const svg = await readFile(svgPath)
const png = await sharp(svg, { density: 144 })
  .resize(1200, 630, { fit: 'contain', background: '#f0fdf4' })
  .png({ compressionLevel: 9, quality: 90 })
  .toBuffer()

await writeFile(pngPath, png)
console.log(`[og-image] wrote ${pngPath} (${png.length} bytes)`)
