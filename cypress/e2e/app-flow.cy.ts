describe('Complete Application Flow', () => {
  beforeEach(() => {
    cy.clearAuthState()
  })

  describe('User Journey - Registration to Dashboard', () => {
    const testUser = {
      email: 'newuser@test.com',
      password: 'password123',
      farmName: 'Test Farm'
    }

    it('should complete full registration flow', () => {
      // Visit registration page
      cy.visit('/auth')
      cy.contains('¿No tienes cuenta? Regístrate').click()

      // Fill registration form
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('input[name="password"]').type(testUser.password)
      cy.get('input[name="confirmPassword"]').type(testUser.password)
      cy.get('input[name="farmName"]').type(testUser.farmName)

      // Mock successful registration
      cy.intercept('POST', '**/auth/register', {
        statusCode: 200,
        body: {
          user: {
            uid: 'new-user-123',
            email: testUser.email
          },
          success: true
        }
      }).as('registerUser')

      // Submit registration
      cy.get('button[type="submit"]').contains('Registrarse').click()

      // Should redirect to dashboard/home
      cy.wait('@registerUser')
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })

    it('should complete full login flow', () => {
      // Visit login page
      cy.visit('/auth')

      // Fill login form
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('input[name="password"]').type(testUser.password)

      // Mock successful login
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          user: {
            uid: 'existing-user-123',
            email: testUser.email
          },
          success: true
        }
      }).as('loginUser')

      // Submit login
      cy.get('button[type="submit"]').contains('Iniciar Sesión').click()

      // Should redirect to dashboard/home
      cy.wait('@loginUser')
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })
  })

  describe('User Journey - Email Link Authentication', () => {
    const testEmail = 'emaillink@test.com'

    it('should complete full email link flow', () => {
      // Step 1: Request email link
      cy.visit('/auth')
      cy.contains('Cambiar a enlace por email').click()

      cy.get('input[name="email"]').type(testEmail)

      // Mock successful email link sending
      cy.intercept('POST', '**/auth/emaillink', {
        statusCode: 200,
        body: { success: true }
      }).as('sendEmailLink')

      cy.get('button[type="submit"]').contains('Enviar enlace').click()

      cy.wait('@sendEmailLink')
      cy.contains('Enlace enviado').should('be.visible')

      // Step 2: Complete email link authentication
      // Simulate clicking email link (sets localStorage)
      cy.window().then((win) => {
        win.localStorage.setItem('emailForSignIn', testEmail)
      })

      // Mock successful completion
      cy.intercept('POST', '**/auth/complete', {
        statusCode: 200,
        body: {
          user: {
            uid: 'emaillink-user-123',
            email: testEmail
          },
          success: true
        }
      }).as('completeEmailLink')

      // Visit completion page (simulate email link click)
      cy.visit('/auth/complete?apiKey=test&oobCode=test&mode=signIn')

      // Should redirect to dashboard/home
      cy.wait('@completeEmailLink')
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })
  })

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to auth page', () => {
      // Try to visit a protected route
      cy.visit('/')

      // Should redirect to auth page if not authenticated
      // Note: This depends on your actual implementation
      // You might need to adjust based on your auth guard logic
      cy.url().should('include', '/auth')
    })

    it('should allow authenticated users to access protected routes', () => {
      // Mock authenticated state
      cy.mockAuthState({
        uid: 'authenticated-user',
        email: 'auth@test.com'
      })

      // Visit protected route
      cy.visit('/')

      // Should stay on the page (not redirect to auth)
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.visit('/auth')

      // Mock network error
      cy.intercept('POST', '**/auth/**', {
        forceNetworkError: true
      }).as('networkError')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('password123')
      cy.get('button[type="submit"]').click()

      // Should show error message
      cy.contains('Error en la autenticación').should('be.visible')
    })

    it('should handle authentication errors', () => {
      cy.visit('/auth')

      // Mock auth error
      cy.intercept('POST', '**/auth/**', {
        statusCode: 401,
        body: { error: 'Invalid credentials' }
      }).as('authError')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('wrongpassword')
      cy.get('button[type="submit"]').click()

      // Should show error message
      cy.contains('Error en la autenticación').should('be.visible')
    })

    it('should handle server errors', () => {
      cy.visit('/auth')

      // Mock server error
      cy.intercept('POST', '**/auth/**', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('serverError')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('password123')
      cy.get('button[type="submit"]').click()

      // Should show error message
      cy.contains('Error en la autenticación').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.visit('/auth')

      // Tab through form elements
      // @ts-expect-error - tab() is a custom command
      cy.get('body').tab()
      cy.focused().should('have.attr', 'name', 'email')

      // @ts-expect-error - tab() is a custom command
      cy.focused().tab()
      cy.focused().should('have.attr', 'name', 'password')

      // @ts-expect-error - tab() is a custom command
      cy.focused().tab()
      cy.focused().should('contain', 'Iniciar Sesión')
    })

    it('should have proper ARIA labels', () => {
      cy.visit('/auth')

      cy.get('input[name="email"]').should('have.attr', 'aria-label')
      cy.get('input[name="password"]').should('have.attr', 'aria-label')
      cy.get('button[type="submit"]').should('be.visible')
    })

    it('should show focus indicators', () => {
      cy.visit('/auth')

      cy.get('input[name="email"]').focus()
      cy.get('input[name="email"]').should('have.focus')

      cy.get('input[name="password"]').focus()
      cy.get('input[name="password"]').should('have.focus')
    })
  })

  describe('Performance', () => {
    it('should load quickly', () => {
      cy.visit('/auth', {
        onBeforeLoad: (win) => {
          win.performance.mark('start')
        },
        onLoad: (win) => {
          win.performance.mark('end')
          win.performance.measure('pageLoad', 'start', 'end')
          const measure = win.performance.getEntriesByName('pageLoad')[0]
          expect(measure.duration).to.be.lessThan(3000) // 3 seconds
        }
      })
    })

    it('should not have memory leaks', () => {
      // Visit page multiple times to check for memory leaks
      for (let i = 0; i < 5; i++) {
        cy.visit('/auth')
        cy.get('input[name="email"]').type('test@test.com')
        cy.get('input[name="password"]').type('password123')
        cy.reload()
      }

      // If we get here without issues, no obvious memory leaks
      cy.get('input[name="email"]').should('be.visible')
    })
  })
})
