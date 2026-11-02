---
title: Catálogo de acciones del asistente
description: Flujos vigentes que deben reutilizarse y contrato de revisión antes de habilitarlos en el chat.
audience: llm+human
last_updated: 2026-11-01
---

# Catálogo de acciones y flujos

Estado: **catálogo tipado y ejecutor de propuestas implementados; validación integral por acción requerida antes de publicar**. La referencia a un formulario manual identifica el flujo que comparte reglas, no implica que ese formulario completo aparezca dentro del chat. Ver [estrategia y fases](README.md).

## Primera versión operativa

| Intención | Consulta o datos necesarios | Revisión y ejecución existentes | Efecto esperado |
| --- | --- | --- | --- |
| Alta de animal, modo Nuevo | Número o sugerencia del sistema, especie, género, nacimiento estimado/real y etapa compatible; estado y datos opcionales del formulario | `SimpleAnimalForm` dentro de `ModalAnimalForm`; alta en `useAnimalCRUD.create`; `createAnimalRegistrationRecord` | Animal y registro de alta; mismas validaciones de identidad, edad y relaciones que en alta manual |
| Consultar destetes | Crías activas sin destetar; nacimiento, madre y referencia de especie | Lectura de utilidades actuales, con cobertura y fecha | Respuesta de pendientes, vencidos y próximos; no cambia etapa ni lactancia |
| Registrar destete | Selección exacta de crías, fecha efectiva, destino Engorda/Reproducción y notas | `WeanedAnimal` / `ModalNewRecord`; `useRecordMovements.wean` y `commitMovement` | Destete, destino y efectos sobre madres según el flujo actual; movimiento y reversión cuando corresponda |
| Revisar montas | Montas activas/terminadas, macho y estado de cada hembra | Lectura autorizada de `breedingRecords` y animales relacionados | Respuesta sin escritura; no confundir conteo de montas con conteo de hembras |
| Crear monta | Macho, hembras, especie, fecha y notas; disponibilidad vigente | `BreedingForm` / `ModalNewRecord`; `useRecordMovements.breeding` | Empadre y movimiento, con todos los animales relacionados; usar el mismo servicio que la UI |
| Confirmar gestación | Empadre, hembras verificadas y fecha de referencia del flujo vigente | Modal actual de confirmación y su validación; extraer/reutilizar el servicio de dominio al habilitar IA | Gestación y parto esperado; si concluye el empadre, mostrar ese efecto y disponibilidad posterior del macho antes de confirmar |

Antes de habilitar cada acción, comprobar que las validaciones actuales estén completas. Reutilizar un hook no prueba por sí solo que servidor y UI aplican todos los permisos o todas las reglas necesarias.

## Ampliaciones posteriores

| Acción | Datos específicos | Condiciones para habilitar |
| --- | --- | --- |
| Alta en modo Parto / crear madre | Madre, nacimiento de la cría, género, ID y datos del parto; si crea madre, nacimiento estimado y estado revisables | Distinguir alta vinculada de parto confirmado. Definir una operación compuesta o pasos separados claramente visibles. Evitar madres o crías huérfanas si se cancela o falla |
| Registrar parto | Madre con gestación activa y empadre relacionado si aplica, fecha/hora, crías, sexo, ID, peso y estado | Reutilizar `ModalBirthForm` / `ModalNewRecord`, `useRecordMovements.birth`; crear crías, actualizar madre y empadre, conservar movimiento/reversión |
| Peso | Animal, fecha, peso y unidad | `ModalNewRecord`, `useRecordMovements.weight`; normalizar a unidad interna sin inventar valores |
| Leche | Madre con lactancia elegible, fecha, litros, turno y notas | `ModalNewRecord`, `useRecordMovements.milk`; respetar propósito de lactancia y conservar historial |
| Salud | Animales, fecha, categoría y descripción; tratamiento/costo si los aporta el usuario | `useRecordMovements.health`; registrar lo reportado sin convertirlo en diagnóstico o prescripción |
| Venta | Animales activos, fecha del movimiento y campos del flujo actual de venta | `ModalSaleForm`, `useRecordMovements.sale`; venta y registros asociados, estado completada según diseño vigente; revisar integridad entre venta y movimiento |
| Finalizar empadre | Empadre y resultados verificados; explicar hembras afectadas y disponibilidad del macho | Reutilizar el flujo vigente después de revisar diferencias con `finish_breeding` antiguo |
| Revertir movimiento | Registro exacto, dependencias y estado posterior | `undoMovement`; jamás restaurar el estado a partir del texto de la conversación |
| Dar de baja / eliminar | Animal, motivo y consecuencias exactas | Posponer hasta integrar los flujos de baja/eliminación y revisión destructiva existentes |

No agregar «recordatorios» como pestaña principal ni acción del botón +: la navegación actual usa Empadres. Si se habilita la creación de recordatorios en el asistente, documentar un flujo accesible y vigente antes de ofrecerlo.

## Qué compartir y qué extraer

Las validaciones y construcción de planes se comparten mediante `lib/domain/record-movement-service.ts` y `lib/domain/animal-registration-service.ts`, con adaptadores cliente/servidor. `useRecordMovements` consume el servicio común; las propuestas usan el mismo constructor de planes y aplican el resultado en una transacción del servidor. La confirmación de gestación y actualización de empadres tienen servicios específicos compartidos.

La revisión del asistente usa `ProposalCard` y `OperationFields`: un editor tipado por operación, con fechas, selectores de animales y valores editables. No es un editor JSON ni monta todos los formularios manuales. Reutilizar los formularios completos queda como mejora de composición; la equivalencia de negocio depende de los servicios compartidos y sus pruebas.

Para altas, compartir generación/validación de número, fechas, etapa, relaciones y registro de alta entre `SimpleAnimalForm`, `useAnimalCRUD` y el servicio de servidor. Las sugerencias automáticas deben resolverse en el servicio para evitar duplicados entre usuarios concurrentes.

Transacciones y comprobantes deben ser la autoridad sobre el éxito. La confirmación desde el chat requiere permisos en servidor aunque el formulario o la UI escondan un botón. Respetar límites de Firestore y las reglas de reversión; no convertir todos los movimientos en un `.add()` directo.

## Revisión visible de una propuesta

Ejemplo de destete, con nombres ilustrativos:

> Destetar A7 y A8 el 1 de noviembre a Engorda.
>
> Se crearán los registros de destete y se actualizará su destino. Mostrar aquí cualquier efecto sobre la madre calculado por el mismo servicio.
>
> Acciones: Editar · Cancelar · Registrar destete.

La revisión muestra campos reales normalizados y efectos calculados. No basta con presentar `action.summary`, que es texto del modelo. Si faltan datos, la propuesta permanece incompleta y no ofrece Guardar.

En una confirmación de gestación que termina el empadre, avisar antes del guardado: el empadre pasará a Terminado y el macho quedará disponible para otra monta. Ese efecto debe obtenerse del estado actual, no mostrarse incondicionalmente.

## Matriz de pruebas por acción

- Caso válido por UI y por asistente: resultado persistido equivalente, incluidos registros y relaciones.
- Datos faltantes, fechas imposibles/futuras, unidades incorrectas y etapas incompatibles.
- Identidad ambigua, duplicado de número, macho/hembra o especie incompatibles.
- Usuario sin permiso; cambio de granja o revocación de permiso después de preparar el borrador.
- Estado modificado entre propuesta y confirmación; animal vendido/muerto o movimiento ya aplicado.
- Reenvío de la misma confirmación, doble clic y error de red después del commit.
- Error parcial en una operación compuesta y reanudación mediante comprobante, nunca una nueva escritura a ciegas.
- Cancelación: no produce movimiento; si hubo un paso independiente ya confirmado, la interfaz lo explica.
- Reversión posterior conserva las restricciones y el orden del historial.
- Confirmaciones y sus resultados permanecen en la conversación; reabrirla no reejecuta nada.

## Retiro del ejecutor anterior

El catálogo nuevo se conecta exclusivamente a los servicios de dominio compartidos. Al implementar el reemplazo, retirar las funciones de escritura directa de `executeAiAction` y cualquier ruta que todavía las invoque. No reutilizarlas como fallback ante errores del nuevo sistema. Invalidar las propuestas antiguas pendientes, conservar sus registros históricos y verificar que no exista una ruta de API que permita seguir ejecutándolas.

## Regla de actualización

Todo cambio en un flujo de esta página debe revisar su `ActionDefinition`, documentos de conocimiento, versión, formulario y pruebas. Si un flujo aún no tiene servicio compartido y pruebas de equivalencia, su estado sigue siendo **consulta o preparación**, no ejecución habilitada.

## Operaciones habilitadas en el catálogo inicial

Contrato de flujo: `OPERATION_VERSION = 1`. El inventario verificable vive en [manifest.json](manifest.json).

| Identificador | Acción | Revisión del asistente |
| --- | --- | --- |
| `create_animal` | Alta en modo Nuevo | Editor tipado de identidad, especie, género, nacimiento y etapa |
| `register_weaning` | Destete | Animales, fecha, destino y notas |
| `create_breeding` | Crear empadre | Macho, hembras, fecha y notas |
| `confirm_pregnancy` | Confirmar gestación | Empadre, hembras y fecha de referencia; efectos sobre cierre del empadre |
| `finish_breeding` | Terminar empadre | Empadre y consecuencias sobre su estado |
| `register_birth` | Registrar parto | Madre, fecha/hora y lista de crías |
| `register_weight` | Registrar peso | Animal, fecha, kg y notas |
| `register_milk` | Registrar leche | Animal, fecha, litros, turno y notas |
| `register_health` | Registrar atención de salud | Animales, fecha, categoría, descripción y campos opcionales |
| `create_sale` | Crear venta completada | Animales, fecha, precio por kg, pesos y comprador |

No se habilita ejecución libre de una acción recibida del cliente: el servidor trabaja con el borrador persistido, su revisión y su versión. No hay fallback al ejecutor antiguo; las solicitudes antiguas por `actionId` reciben 410. Crear recordatorios, eliminar animales y deshacer movimientos desde el chat no forman parte de estas diez operaciones.

La confirmación de gestación recibe `context.timeZone`; el cálculo compartido de parto esperado se apoya en `lib/domain/farm-calendar.ts`. Al cambiar zona o reglas de fechas, revisar `time-zone.ts`, `knowledge-dates.ts`, el servicio de gestación, las pruebas y esta documentación.
