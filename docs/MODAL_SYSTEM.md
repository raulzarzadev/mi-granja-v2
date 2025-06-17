# Sistema de Modales Reutilizables

Este sistema proporciona un patrón consistente para crear modales en la aplicación.

## Componentes Principales

### 1. `Modal` - Componente base

Componente reutilizable que maneja la lógica común de modales.

### 2. `useModal` - Hook personalizado

Hook que proporciona el estado y funciones para controlar modales.

### 3. Formularios separados

- `BreedingForm` - Solo el formulario
- `AnimalForm` - Solo el formulario

### 4. Wrapper de modales

- `ModalBreedingForm` - Modal + BreedingForm + botón trigger
- `ModalAnimalForm` - Modal + AnimalForm + botón trigger

## Patrón de Uso

### Opción 1: Modal personalizado

```tsx
import { Modal } from '@/components/Modal'
import { useModal } from '@/hooks/useModal'

const MyComponent = () => {
  const { isOpen, openModal, closeModal } = useModal()

  return (
    <>
      <button onClick={openModal}>Abrir Modal</button>

      <Modal isOpen={isOpen} onClose={closeModal} title="Mi Modal">
        <div className="p-6">
          {/* Tu contenido aquí */}
        </div>
      </Modal>
    </>
  )
}
```

### Opción 2: Modal con formulario wrapper (Recomendado)

```tsx
import ModalBreedingForm from '@/components/ModalBreedingForm'

const MyComponent = () => {
  const handleSubmit = async (data) => {
    // Lógica para guardar
  }

  return (
    <ModalBreedingForm
      animals={animals}
      onSubmit={handleSubmit}
    />
  )
}
```

### Opción 3: Modal con botón personalizado

```tsx
import ModalAnimalForm from '@/components/ModalAnimalForm'

const MyComponent = () => {
  return (
    <ModalAnimalForm
      onSubmit={handleSubmit}
      triggerButton={
        <button className="custom-button">
          🐄 Agregar Animal
        </button>
      }
    />
  )
}
```

## Ventajas del Patrón

1. **Separación de responsabilidades**:

   - Formularios son independientes y reutilizables
   - Modales manejan solo la lógica de modal
   - Wrappers conectan todo

2. **Flexibilidad**:

   - Usar formularios sin modal
   - Usar modales con contenido personalizado
   - Usar wrappers para casos comunes

3. **Consistencia**:

   - Todos los modales tienen el mismo comportamiento
   - Estilos y animaciones unificados

4. **Mantenibilidad**:
   - Cambios en el modal afectan a todos
   - Formularios pueden evolucionar independientemente

## Propiedades del Modal

- `isOpen: boolean` - Estado del modal
- `onClose: () => void` - Función para cerrar
- `title?: string` - Título opcional
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Tamaño
- `closeOnOverlayClick?: boolean` - Cerrar al hacer click fuera
- `closeOnEscape?: boolean` - Cerrar con Escape
- `showCloseButton?: boolean` - Mostrar botón X
- `className?: string` - Clases CSS adicionales

## Funciones del Hook useModal

- `isOpen: boolean` - Estado actual
- `openModal: () => void` - Abrir modal
- `closeModal: () => void` - Cerrar modal
- `toggleModal: () => void` - Alternar estado
