describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearAuthState()
  })

  describe('Password Authentication', () => {
    it('should display login form by default', () => {
      cy.visit('/auth')

      cy.contains('Acceso a Mi Granja').should('be.visible')
      cy.get('input[name="email"]').should('be.visible')
      cy.get('input[name="password"]').should('be.visible')
      cy.get('button[type="submit"]')
        .contains('Iniciar Sesión')
        .should('be.visible')
    })

    it('should switch to register form', () => {
      cy.visit('/auth')

      cy.contains('¿No tienes cuenta? Regístrate').click()

      cy.contains('Registro en Mi Granja').should('be.visible')
      cy.get('input[name="confirmPassword"]').should('be.visible')
      cy.get('input[name="farmName"]').should('be.visible')
      cy.get('button[type="submit"]')
        .contains('Registrarse')
        .should('be.visible')
    })

    it('should validate email field', () => {
      cy.visit('/auth')

      // Submit without email
      cy.get('button[type="submit"]').click()
      cy.contains('El email es requerido').should('be.visible')

      // Enter invalid email
      cy.get('input[name="email"]').type('invalid-email')
      cy.get('button[type="submit"]').click()
      cy.contains('El email no es válido').should('be.visible')
    })

    it('should validate password field', () => {
      cy.visit('/auth')

      cy.get('input[name="email"]').type('test@test.com')

      // Submit without password
      cy.get('button[type="submit"]').click()
      cy.contains('La contraseña es requerida').should('be.visible')

      // Enter short password
      cy.get('input[name="password"]').type('123')
      cy.get('button[type="submit"]').click()
      cy.contains('La contraseña debe tener al menos 6 caracteres').should(
        'be.visible'
      )
    })

    it('should validate password confirmation in register mode', () => {
      cy.visit('/auth')

      cy.contains('¿No tienes cuenta? Regístrate').click()

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('password123')
      cy.get('input[name="confirmPassword"]').type('different')

      cy.get('button[type="submit"]').click()
      cy.contains('Las contraseñas no coinciden').should('be.visible')
    })

    it('should show loading state during authentication', () => {
      cy.visit('/auth')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('password123')

      // Intercept the auth request to make it slow
      cy.intercept('POST', '**/auth/**', {
        delay: 1000,
        statusCode: 200,
        body: { success: true }
      }).as('authRequest')

      cy.get('button[type="submit"]').click()

      // Check for loading state (button disabled or loading text)
      cy.get('button[type="submit"]').should('be.disabled')
    })
  })

  describe('Email Link Authentication', () => {
    it('should switch to email link mode', () => {
      cy.visit('/auth')

      cy.contains('Cambiar a enlace por email').click()

      cy.contains('Iniciar sesión con enlace por email').should('be.visible')
      cy.get('input[name="password"]').should('not.exist')
      cy.get('button[type="submit"]')
        .contains('Enviar enlace')
        .should('be.visible')
    })

    it('should send email link and show confirmation', () => {
      cy.visit('/auth')

      cy.contains('Cambiar a enlace por email').click()

      // Mock successful email link sending
      cy.intercept('POST', '**/auth/**', {
        statusCode: 200,
        body: { success: true }
      }).as('sendEmailLink')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('button[type="submit"]').click()

      cy.contains('Enlace enviado').should('be.visible')
      cy.contains('Revisa tu email').should('be.visible')
      cy.contains('Reenviar enlace').should('be.visible')
    })

    it('should allow resending email link', () => {
      cy.visit('/auth')

      cy.contains('Cambiar a enlace por email').click()

      // Mock successful email link sending
      cy.intercept('POST', '**/auth/**', {
        statusCode: 200,
        body: { success: true }
      }).as('sendEmailLink')

      cy.get('input[name="email"]').type('test@test.com')
      cy.get('button[type="submit"]').click()

      cy.wait('@sendEmailLink')

      // Click resend
      cy.contains('Reenviar enlace').click()

      cy.wait('@sendEmailLink')
      cy.contains('Enlace reenviado').should('be.visible')
    })

    it('should switch back to password method', () => {
      cy.visit('/auth')

      cy.contains('Cambiar a enlace por email').click()
      cy.contains('Cambiar a contraseña').click()

      cy.get('input[name="password"]').should('be.visible')
      cy.get('button[type="submit"]')
        .contains('Iniciar Sesión')
        .should('be.visible')
    })
  })

  describe('Complete Email Link Authentication', () => {
    it('should handle valid email link completion', () => {
      // Mock localStorage with email
      cy.window().then((win) => {
        win.localStorage.setItem('emailForSignIn', 'test@test.com')
      })

      // Mock successful completion
      cy.intercept('POST', '**/auth/**', {
        statusCode: 200,
        body: {
          user: { uid: '123', email: 'test@test.com' },
          success: true
        }
      }).as('completeAuth')

      // Visit with mock email link parameters
      cy.visit('/auth/complete?apiKey=test&oobCode=test&mode=signIn')

      cy.contains('Completando autenticación').should('be.visible')

      // Should redirect to home page after successful completion
      cy.url().should('eq', Cypress.config().baseUrl + '/')
    })

    it('should prompt for email when not stored', () => {
      cy.visit('/auth/complete?apiKey=test&oobCode=test&mode=signIn')

      cy.contains('Confirma tu email').should('be.visible')
      cy.get('input[name="email"]').should('be.visible')
      cy.get('button[type="submit"]')
        .contains('Completar autenticación')
        .should('be.visible')
    })

    it('should handle invalid email link', () => {
      cy.visit('/auth/complete')

      cy.contains('Error').should('be.visible')
      cy.contains(
        'El enlace de autenticación no es válido o ha expirado'
      ).should('be.visible')
      cy.contains('Volver al login').should('be.visible')
    })

    it('should handle completion errors', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('emailForSignIn', 'test@test.com')
      })

      // Mock error response
      cy.intercept('POST', '**/auth/**', {
        statusCode: 400,
        body: { error: 'Invalid email link' }
      }).as('completeAuthError')

      cy.visit('/auth/complete?apiKey=test&oobCode=test&mode=signIn')

      cy.contains('Error').should('be.visible')
      cy.contains('Error al completar la autenticación').should('be.visible')
    })
  })

  describe('Navigation and UX', () => {
    it('should navigate back to login from completion page', () => {
      cy.visit('/auth/complete')

      cy.contains('Volver al login').click()
      cy.url().should('include', '/auth')
      cy.contains('Acceso a Mi Granja').should('be.visible')
    })

    it('should clear form errors when switching between modes', () => {
      cy.visit('/auth')

      // Trigger validation error
      cy.get('button[type="submit"]').click()
      cy.contains('El email es requerido').should('be.visible')

      // Switch to email link mode
      cy.contains('Cambiar a enlace por email').click()

      // Error should be cleared
      cy.contains('El email es requerido').should('not.exist')
    })

    it('should clear form errors when switching between login/register', () => {
      cy.visit('/auth')

      // Trigger validation error in login
      cy.get('button[type="submit"]').click()
      cy.contains('El email es requerido').should('be.visible')

      // Switch to register
      cy.contains('¿No tienes cuenta? Regístrate').click()

      // Error should be cleared
      cy.contains('El email es requerido').should('not.exist')
    })

    it('should be responsive on mobile viewport', () => {
      cy.viewport('iphone-6')
      cy.visit('/auth')

      cy.contains('Acceso a Mi Granja').should('be.visible')
      cy.get('input[name="email"]').should('be.visible')
      cy.get('input[name="password"]').should('be.visible')

      // Form should be usable on mobile
      cy.get('input[name="email"]').type('test@test.com')
      cy.get('input[name="password"]').type('password123')
      cy.get('button[type="submit"]')
        .should('be.visible')
        .and('not.be.disabled')
    })
  })
})
