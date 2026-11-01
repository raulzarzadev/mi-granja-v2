import { createRequire } from 'node:module'
import { globSync } from 'node:fs'

const require = createRequire(import.meta.url)
const sharp = require(process.cwd() + '/' + globSync('node_modules/.pnpm/sharp@*/node_modules/sharp')[0])
const source = 'apps/dashboard/public/icons/app-icon-source.png'
for (const [name, size] of [['apple-touch-icon.png',180],['icon-192x192.png',192],['icon-512x512.png',512],['icon-maskable-512x512.png',512]]) {
  const icon = name.includes('maskable')
    ? sharp(source).resize(410,410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#31833e' })
    : sharp(source).resize(size,size)
  await icon.png().toFile(`apps/dashboard/public/icons/${name}`)
}
