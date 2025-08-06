# Sistema de Impersonación de Administradores

Este sistema permite que los administradores actúen como otros usuarios en la aplicación, realizando movimientos y acciones en su nombre. Todas las acciones realizadas por un admin están marcadas y son rastreables.

## Funcionalidades

### 1. Impersonación de Usuarios

- Los admins pueden "actuar como" cualquier otro usuario
- Selector de usuarios con búsqueda por email o nombre de granja
- Indicador visual cuando se está en modo impersonación

### 2. Rastreo de Acciones

- Todas las acciones realizadas durante la impersonación están marcadas
- Se registra qué admin realizó la acción y cuándo
- Se puede agregar un motivo para la acción

### 3. Seguridad

- Solo usuarios con rol de admin pueden usar esta funcionalidad
- Se mantiene referencia del admin original durante toda la sesión
- Tokens de impersonación separados de los tokens normales

## Uso

### Para Administradores

1. **Iniciar Impersonación:**

   - Hacer clic en "👤 Actuar como usuario" en la barra de navegación
   - Buscar y seleccionar el usuario objetivo
   - El sistema cambiará automáticamente al contexto del usuario seleccionado

2. **Durante la Impersonación:**

   - Aparece un indicador amarillo en la barra de navegación
   - Todas las acciones se realizan como si fuera el usuario objetivo
   - Las acciones quedan marcadas con metadata de admin

3. **Finalizar Impersonación:**
   - Hacer clic en "Volver a mi cuenta" en el selector de usuarios
   - O cerrar sesión (limpia automáticamente la impersonación)

### Para Desarrolladores

#### Usar el Hook useAdminActions

```tsx
import { useAdminActions } from '@/lib/adminActions'

const MyComponent = () => {
  const { wrapWithAdminMetadata, isImpersonating } = useAdminActions()

  const saveData = async (data) => {
    // Envolver datos con metadata de admin automáticamente
    const finalData = wrapWithAdminMetadata(data, 'Motivo de la acción')

    // Guardar en base de datos
    await saveToDatabase(finalData)
  }
}
```

#### Mostrar Indicador de Acción de Admin

```tsx
import AdminActionIndicator from '@/components/AdminActionIndicator'

const AnimalCard = ({ animal }) => {
  return (
    <div>
      {/* Contenido normal */}

      {/* Mostrar si fue acción de admin */}
      <AdminActionIndicator data={animal} />
    </div>
  )
}
```

#### Actualizar Hooks CRUD

Los hooks como `useAnimalCRUD` ya están actualizados para usar automáticamente el sistema de admin:

```tsx
// useAnimalCRUD.ts
const create = async (animalData) => {
  // ... lógica existente ...

  // Se añade automáticamente metadata de admin si hay impersonación
  newAnimal = wrapWithAdminMetadata(newAnimal, 'Creación de animal')

  // ... guardar en base de datos ...
}
```

## APIs

### GET /api/admin/users

Obtiene lista de usuarios para impersonación (solo admins)

**Headers requeridos:**

- `Authorization: Bearer <token>`
- `x-user-email: <admin-email>`

### POST /api/admin/impersonate

Inicia impersonación de un usuario (solo admins)

**Body:**

```json
{
  "targetUserId": "user-id-to-impersonate"
}
```

**Response:**

```json
{
  "user": { /* datos del usuario objetivo */ },
  "token": "impersonation-token"
}
```

## Estructura de Metadata de Admin

Cuando un admin realiza una acción, se añade la siguiente estructura:

```typescript
{
  adminAction: {
    performedByAdmin: true,
    adminEmail: "admin@example.com",
    adminId: "admin-user-id",
    originalTimestamp: Date,
    impersonationReason?: "Motivo opcional"
  }
}
```

## Componentes Principales

- **`Navbar`**: Incluye botón para acceder al selector de usuarios
- **`UserImpersonationSelector`**: Selector de usuarios para impersonación
- **`AdminActionIndicator`**: Muestra cuando una acción fue realizada por admin
- **`useAuth`**: Hook extendido con funciones de impersonación
- **`useAdminActions`**: Hook con utilidades para manejo de metadata de admin

## Estado de Redux

El estado de autenticación incluye nuevos campos:

```typescript
interface AuthState {
  // ... campos existentes ...
  originalUser?: User | null      // Admin original
  impersonatingUser?: User | null // Usuario siendo suplantado
  impersonationToken?: string | null // Token de impersonación
}
```

## Consideraciones de Seguridad

1. **Verificación de Roles**: Solo usuarios con rol 'admin' pueden impersonar
2. **Rastreo Completo**: Todas las acciones quedan registradas con información del admin
3. **Tokens Separados**: Los tokens de impersonación son diferentes a los normales
4. **Limpieza Automática**: Al cerrar sesión se limpia toda la información de impersonación

## Ejemplo de Uso Completo

```tsx
// En un componente de admin
const AdminDashboard = () => {
  const { isImpersonating, impersonatingUser, originalUser } = useAuth()

  return (
    <div>
      {isImpersonating && (
        <div className="alert">
          Actuando como: {impersonatingUser?.farmName}
          Admin original: {originalUser?.email}
        </div>
      )}

      {/* Resto del dashboard */}
    </div>
  )
}

// En un hook CRUD
const useMyDataCRUD = () => {
  const { wrapWithAdminMetadata } = useAdminActions()

  const saveData = async (data) => {
    const finalData = wrapWithAdminMetadata(data, 'Actualización de datos')
    await saveToFirestore(finalData)
  }
}

// En un componente que muestra datos
const DataCard = ({ data }) => {
  return (
    <div>
      <h3>{data.title}</h3>
      <AdminActionIndicator data={data} />
    </div>
  )
}
```
