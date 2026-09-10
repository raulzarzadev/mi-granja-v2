import { expect, test } from '@playwright/test'
import { login } from './helpers'

test('dashboard does not create page-level horizontal scroll on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 272, height: 638 })
  await login(page)
  await page.getByRole('tab', { name: /animales/i }).click()

  await expect.poll(async () =>
    page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    })),
  ).toEqual({ document: 0, body: 0 })
})
