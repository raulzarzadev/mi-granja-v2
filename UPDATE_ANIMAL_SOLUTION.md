# Solución para updateAnimal con Actualizaciones Parciales

## Problema Identificado

El action `updateAnimal` en el slice esperaba recibir un objeto `Animal` completo como payload, pero se estaba intentando pasar `animalNumber` y `updateData` por separado:

```typescript
// ❌ INCORRECTO - El slice esperaba un Animal completo
dispatch(updateAnimal(animalNumber, updateData))

// ✅ El slice esperaba esto:
updateAnimal: (state, action: PayloadAction<Animal>) => {
  // ...
}
```

## Solución Implementada

### 1. Nuevo Action en animalsSlice.ts

Se agregó una nueva acción `updateAnimalPartial` que acepta actualizaciones parciales:

```typescript
updateAnimalPartial: (state, action: PayloadAction<{ id: string; data: Partial<Animal> }>) => {
  const index = state.animals.findIndex(
    (animal) => animal.id === action.payload.id
  )
  if (index !== -1) {
    state.animals[index] = serializeObj({
      ...state.animals[index],
      ...action.payload.data,
      updatedAt: new Date()
    })
  }
},
```

### 2. Actualización del Export

```typescript
export const {
  setLoading,
  setAnimals,
  addAnimal,
  updateAnimal,        // ← Acción original (Animal completo)
  updateAnimalPartial, // ← Nueva acción (actualizaciones parciales)
  removeAnimal,
  setSelectedAnimal,
  setError,
  clearError
} = animalsSlice.actions
```

### 3. Modificación del Hook useAnimalCRUD.ts

```typescript
// Importar la nueva acción
import { setError, updateAnimalPartial } from '@/features/animals/animalsSlice'

// Usar la nueva acción en la función update
const update = async (animalNumber: string, updateData: Partial<Animal>) => {
  // ...código existente...

  // ✅ CORRECTO - Usar la nueva acción para actualizaciones parciales
  dispatch(updateAnimalPartial({ id: animalNumber, data: updateData }))

  await updateDoc(animalRef, updatedData)
  // ...resto del código...
}
```

## Beneficios de la Solución

### 1. **Flexibilidad**

- `updateAnimal`: Para cuando tienes el objeto Animal completo
- `updateAnimalPartial`: Para actualizaciones parciales (más común)

### 2. **Eficiencia**

- No necesitas obtener el animal completo antes de actualizarlo
- Menor transferencia de datos
- Operaciones más rápidas

### 3. **Inmutabilidad**

- Redux Toolkit maneja la inmutabilidad automáticamente
- Se preservan todos los campos existentes
- Solo se actualizan los campos especificados

### 4. **Consistencia**

- Mantiene el patrón establecido en el slice
- Actualiza automáticamente `updatedAt`
- Maneja la serialización correctamente

## Uso Correcto

```typescript
// ✅ Para actualizaciones parciales (más común)
dispatch(updateAnimalPartial({
  id: "animal-123",
  data: { weight: 250, notes: "Nueva nota" }
}))

// ✅ Para reemplazar el animal completo
dispatch(updateAnimal({
  id: "animal-123",
  farmerId: "farmer-1",
  animalNumber: "COW-001",
  // ... todos los campos requeridos
}))
```

## Compatibilidad

- ✅ Mantiene la funcionalidad existente
- ✅ No rompe código que use `updateAnimal`
- ✅ Agrega nueva funcionalidad sin cambios breaking
- ✅ TypeScript valida los tipos correctamente

La solución es robusta, eficiente y mantiene la compatibilidad hacia atrás mientras proporciona la flexibilidad necesaria para actualizaciones parciales.
