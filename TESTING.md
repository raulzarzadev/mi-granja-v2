# Tests para Mi Granja

Esta aplicación incluye tests completos usando Jest/React Testing Library para unit tests y Cypress para E2E tests.

## Configuración de Tests

### Unit Tests (Jest + React Testing Library)

Los unit tests están configurados para probar:

- Componentes React aislados
- Context API (AuthContext)
- Redux store (authSlice)
- Utilidades y hooks personalizados

### E2E Tests (Cypress)

Los E2E tests cubren:

- Flujos completos de autenticación
- Navegación entre páginas
- Manejo de errores
- Responsive design
- Accesibilidad

## Comandos de Test

```bash
# Ejecutar unit tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con coverage
npm run test:coverage

# Abrir Cypress para E2E tests
npm run cypress:open

# Ejecutar E2E tests en modo headless
npm run cypress:run

# Ejecutar todos los tests
npm run test:all
```

## Estructura de Tests

```
src/
├── __tests__/
│   ├── features/
│   │   └── auth/
│   │       ├── AuthContext.test.tsx
│   │       ├── AuthContext.errors.test.tsx
│   │       └── AuthForm.test.tsx
│   ├── app/
│   │   ├── page.test.tsx
│   │   └── auth/
│   │       └── complete/
│   │           └── page.test.tsx
│   ├── store/
│   │   └── authSlice.test.ts
│   ├── test-utils.tsx
│   └── setup.d.ts
cypress/
├── e2e/
│   ├── auth.cy.ts
│   └── app-flow.cy.ts
├── support/
│   ├── commands.ts
│   └── e2e.ts
└── fixtures/
```

## Tests Implementados

### Unit Tests

#### AuthContext Tests

- ✅ Provee contexto de autenticación
- ✅ Login con email/password
- ✅ Registro de usuarios
- ✅ Login con enlace por email
- ✅ Completar autenticación por enlace
- ✅ Logout
- ✅ Manejo de errores de Firebase
- ✅ Manejo de errores de red

#### AuthForm Tests

- ✅ Renderiza formulario de login
- ✅ Cambia entre login y registro
- ✅ Cambia método de autenticación
- ✅ Validación de formularios
- ✅ Envío de formularios
- ✅ Manejo de estados de carga
- ✅ Mostrar mensajes de éxito/error

#### Redux Store Tests

- ✅ Estado inicial
- ✅ Acciones setUser, setLoading, setError, logout
- ✅ Secuencias de acciones

### E2E Tests

#### Flujo de Autenticación

- ✅ Login con password
- ✅ Registro de usuarios
- ✅ Login con enlace por email
- ✅ Validación de formularios
- ✅ Manejo de errores
- ✅ Estados de carga

#### Flujo Completo de Aplicación

- ✅ Registro → Dashboard
- ✅ Login → Dashboard
- ✅ Autenticación por enlace completa
- ✅ Rutas protegidas
- ✅ Manejo de errores de red

#### Accesibilidad y UX

- ✅ Navegación por teclado
- ✅ ARIA labels
- ✅ Indicadores de foco
- ✅ Responsive design

## Mocks y Utilities

### Firebase Mocks

Los tests usan mocks de Firebase Auth y Firestore para evitar hacer llamadas reales a los servicios.

### Test Utilities

- `createMockUser`: Crea usuarios de test
- `createMockStore`: Crea store de Redux para tests
- `renderWithProviders`: Renderiza componentes con providers
- `mockFirebaseAuthSuccess/Error`: Mock respuestas de Firebase

## Coverage

Los tests están configurados para generar reportes de coverage que incluyen:

- Statements
- Branches
- Functions
- Lines

## CI/CD

Los tests se pueden integrar fácilmente en pipelines de CI/CD:

```yaml
# Ejemplo para GitHub Actions
- name: Run Tests
  run: |
    npm ci
    npm run test:coverage
    npm run cypress:run
```

## Debugging Tests

Para debuggear tests:

```bash
# Ejecutar un test específico
npm test -- AuthContext.test.tsx

# Ejecutar con verbose output
npm test -- --verbose

# Ejecutar con watch mode
npm run test:watch
```

Para E2E tests con Cypress:

- Usar `cy.debug()` para pausar ejecución
- Usar `cy.screenshot()` para capturar estado
- Inspeccionar en el navegador de Cypress
