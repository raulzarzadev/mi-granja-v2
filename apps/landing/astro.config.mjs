import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://www.migranja.app',
  integrations: [
    sitemap({
      filter: (page) => !/\.(?:md|txt)$/.test(new URL(page).pathname),
      namespaces: { news: false, video: false },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 3001,
  },
})
