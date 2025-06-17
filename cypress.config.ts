import { defineConfig } from 'cypress'
import codeCoverageTask from '@cypress/code-coverage/task'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      codeCoverageTask(on, config)
      return config
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts'
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    },
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config)
      return config
    }
  },
  env: {
    coverage: true
  },
  video: false,
  screenshotOnRunFailure: false,
  viewportWidth: 1280,
  viewportHeight: 720
})
