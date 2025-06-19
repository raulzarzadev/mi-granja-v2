# Migración de Context API a Redux para Autenticación

## Cambios Realizados

### 1. Estructura de Archivos

- ✅ **Actualizado**: `src/hooks/useAnimals.ts` - Ahora importa desde `@/features/animals/animalsSlice`
- ✅ **Creado**: `src/hooks/useAuth.ts` - Hook personalizado que reemplaza el Context API
- ✅ **Actualizado**: `src/features/auth/AuthContext.tsx` - Convertido a `AuthInitializer` (solo listener de Firebase)
- ✅ **Actualizado**: `src/app/providers.tsx` - Usa `AuthInitializer` en lugar de `AuthProvider`

### 2. Hooks Actualizados

- ✅ `src/components/Navbar.tsx` - Importa `useAuth` desde `@/hooks/useAuth`
- ✅ `src/features/auth/AuthForm.tsx` - Importa `useAuth` desde `@/hooks/useAuth`
- ✅ `src/app/auth/complete/page.tsx` - Importa `useAuth` desde `@/hooks/useAuth`

### 3. Nueva Arquitectura

#### Antes (Context API):

```
AuthProvider (Context)
  ├── useAuth hook con Context
  └── Todas las funciones de auth en el Context
```

#### Después (Redux):

```
AuthInitializer (solo listener de Firebase)
  ├── useAuth hook con Redux
  ├── Estado en authSlice
  └── Funciones de auth en el hook
```

### 4. Funcionalidades del nuevo useAuth

El hook `useAuth` ahora proporciona:

- `user` - Usuario actual desde Redux
- `isLoading` - Estado de carga desde Redux
- `error` - Errores de autenticación desde Redux
- `login(email, password)` - Iniciar sesión
- `register(email, password, farmName?)` - Registrar usuario
- `logout()` - Cerrar sesión
- `loginWithEmailLink(email)` - Enviar enlace de autenticación
- `completeEmailLinkSignIn(email, url)` - Completar autenticación con enlace
- `isEmailLinkSignIn(url)` - Verificar si URL es enlace de auth
- `clearError()` - Limpiar errores

### 5. Ventajas de la Nueva Estructura

1. **Consistencia**: Toda la aplicación usa Redux
2. **Mejor gestión de estado**: Estado centralizado en store
3. **Mejor testing**: Más fácil de testear sin Context
4. **Mejor performance**: Redux optimiza re-renders
5. **Escalabilidad**: Más fácil agregar nueva funcionalidad

### 6. Archivos que Necesitan Actualización en Tests

Los siguientes archivos de test aún referencian la estructura anterior:

- `src/__tests__/store/authSlice.test.ts`
- `src/__tests__/test-utils.tsx`
- `src/__tests__/features/auth/AuthForm.new.test.tsx`
- `src/__tests__/features/auth/AuthContext.test.tsx`
- Otros archivos de test con extensión `.disabled`

### 7. Uso en Componentes

**Antes:**

```tsx
import { useAuth } from '@/features/auth/AuthContext'

// Dentro del componente
const { login, user, isLoading } = useAuth()
```

**Después:**

```tsx
import { useAuth } from '@/hooks/useAuth'

// Dentro del componente
const { login, user, isLoading } = useAuth()
```

El API del hook se mantiene igual, solo cambió la ubicación del import.

### 8. Estado de la Migración

✅ **Completado**: Migración principal de Context API a Redux
✅ **Completado**: Actualización de imports en componentes principales
⚠️ **Pendiente**: Actualización de archivos de test
⚠️ **Pendiente**: Validación completa de funcionalidad
