import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

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
    expect(html).toContain('dashboard.migranja.app')
  })
})
