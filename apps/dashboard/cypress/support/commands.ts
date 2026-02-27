/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Firebase Auth commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email/password
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>

      /**
       * Custom command to register a new user
       * @example cy.register('user@example.com', 'password', 'Farm Name')
       */
      register(email: string, password: string, farmName?: string): Chainable<void>

      /**
       * Custom command to logout
       * @example cy.logout()
       */
      logout(): Chainable<void>

      /**
       * Custom command to mock Firebase auth state
       * @example cy.mockAuthState({ uid: '123', email: 'test@test.com' })
       */
      mockAuthState(user: any): Chainable<void>

      /**
       * Custom command to clear auth state
       * @example cy.clearAuthState()
       */
      clearAuthState(): Chainable<void>
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth')
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)
  cy.get('button[type="submit"]').contains('Iniciar Sesión').click()
})

// Register command
Cypress.Commands.add('register', (email: string, password: string, farmName?: string) => {
  cy.visit('/auth')
  cy.contains('¿No tienes cuenta? Regístrate').click()
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)
  cy.get('input[name="confirmPassword"]').type(password)
  if (farmName) {
    cy.get('input[name="farmName"]').type(farmName)
  }
  cy.get('button[type="submit"]').contains('Registrarse').click()
})

// Logout command
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    // Simulate logout by clearing localStorage and triggering auth state change
    win.localStorage.clear()
    // You might need to trigger a page reload or navigate to auth page
    cy.visit('/auth')
  })
})

// Mock auth state command
Cypress.Commands.add('mockAuthState', (user: any) => {
  cy.window().then((win) => {
    // Mock authenticated state in localStorage or sessionStorage
    win.localStorage.setItem('mockAuthUser', JSON.stringify(user))
  })
})

// Clear auth state command
Cypress.Commands.add('clearAuthState', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
})

export {}
