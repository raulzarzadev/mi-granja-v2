import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LANDING_DIR = join(__dirname, '..')

describe('Landing Astro build smoke test', () => {
  beforeAll(() => {
    // Build the Astro site
    execSync('npx astro build', {
      cwd: LANDING_DIR,
      stdio: 'pipe',
      timeout: 60000,
    })
  }, 90000)

  it('should produce dist/index.html', () => {
    const indexPath = join(LANDING_DIR, 'dist', 'index.html')
    expect(existsSync(indexPath)).toBe(true)
  })

  it('should contain lang="es"', () => {
    const html = readFileSync(join(LANDING_DIR, 'dist', 'index.html'), 'utf-8')
    expect(html).toContain('lang="es"')
  })

  it('should contain "Mi Granja"', () => {
    const html = readFileSync(join(LANDING_DIR, 'dist', 'index.html'), 'utf-8')
    expect(html).toContain('Mi Granja')
  })

  it('should contain link to dashboard', () => {
    const html = readFileSync(join(LANDING_DIR, 'dist', 'index.html'), 'utf-8')
    expect(html).toContain('panel.migranja.app')
  })

  it('publishes canonical, social and machine-readable metadata', () => {
    const html = readFileSync(join(LANDING_DIR, 'dist', 'index.html'), 'utf-8')

    expect(html).toContain('<link rel="canonical" href="https://www.migranja.app/">')
    expect(html).toContain('rel="alternate" type="text/markdown"')
    expect(html).toContain('rel="describedby" href="https://www.migranja.app/llms.txt"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('"@type":"SoftwareApplication"')
    expect(html).toContain('"@type":"WebSite"')
  })

  it('publishes focused LLM resources', () => {
    const llms = readFileSync(join(LANDING_DIR, 'dist', 'llms.txt'), 'utf-8')
    const homeMarkdown = readFileSync(join(LANDING_DIR, 'dist', 'index.md'), 'utf-8')
    const pricesMarkdown = readFileSync(join(LANDING_DIR, 'dist', 'prices.md'), 'utf-8')

    expect(llms).toContain('# Mi Granja')
    expect(llms).toContain('https://www.migranja.app/index.md')
    expect(homeMarkdown).toContain('## Asistente IA')
    expect(pricesMarkdown).toContain('## Planes publicados')
  })

  it('keeps machine-readable resources out of the search sitemap', () => {
    const sitemap = readFileSync(join(LANDING_DIR, 'dist', 'sitemap-0.xml'), 'utf-8')

    expect(sitemap).toContain('https://www.migranja.app/')
    expect(sitemap).toContain('https://www.migranja.app/prices')
    expect(sitemap).not.toContain('.md')
    expect(sitemap).not.toContain('llms.txt')
  })
})
