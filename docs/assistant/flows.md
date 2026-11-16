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
| Sanidad | Animales, fecha, categorías (una o varias) y descripción; tratamiento/costo si los aporta el usuario | `useRecordMovements.health`; registrar lo reportado sin convertirlo en diagnóstico o prescripción |
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

Contrato de flujo: `OPERATION_VERSION = 3`. El inventario verificable vive en [manifest.json](manifest.json).

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
| `register_death` | Registrar muerte de 1–50 animales activos | Animales, fecha efectiva, motivo obligatorio y notas opcionales |
| `register_health` | Registrar atención de sanidad | Animales (`animalRefs`, hasta 50) **o** grupo de activos (`animalGroup` por especie/sexo), fecha, categoría principal (`category`) y opcionalmente todas en `categories[]`, descripción y campos opcionales |
| `create_sale` | Crear venta completada | Animales, fecha, precio por kg, pesos y comprador |
| `create_reminder` | Crear recordatorio | Título, fecha (hoy o futura), prioridad, tipo, animales opcionales y descripción |
| `create_area` | Crear área de la granja | Nombre único, tipo de área, superficie (m²) opcional y descripción |

No se habilita ejecución libre de una acción recibida del cliente: el servidor trabaja con el borrador persistido, su revisión y su versión. No hay fallback al ejecutor antiguo; las solicitudes antiguas por `actionId` reciben 410. Eliminar animales y deshacer movimientos desde el chat no forman parte del catálogo.

La confirmación de gestación recibe `context.timeZone`; el cálculo compartido de parto esperado se apoya en `lib/domain/farm-calendar.ts`. Al cambiar zona o reglas de fechas, revisar `time-zone.ts`, `knowledge-dates.ts`, el servicio de gestación, las pruebas y esta documentación.

La revisión utiliza el título de modal «Confirmar acción». Dentro del cuerpo destaca el nombre de la operación y su explicación específica, seguidos de animales, fechas, datos y efectos calculados por el servidor. El usuario debe poder reconocer qué se hará sin depender del título del modal.

Los códigos únicos de empadre mencionados en el chat abren una ficha compacta sobre la conversación, con fecha, estado, macho y hembras agrupadas mediante los helpers actuales de empadres. Los animales de la ficha abren sus detalles conservando ambos contextos. Se resuelven solo registros de la granja actual; las referencias ambiguas entre animales y empadres no se enlazan como empadres. No ejecuta movimientos.

La ficha de empadre del chat permite confirmar gestación de hembras pendientes, sacar participantes y registrar parto de gestantes. Reutiliza `ModalConfirmPregnancy`, `ModalBirthForm`, `useBreedingHandlers` y los movimientos compartidos. Respeta permisos; sacar requiere confirmación explícita y advierte si eliminará todo el empadre. Confirmar gestación o parto conserva la ficha y el chat; eliminar el empadre cierra su ficha.

En la ficha del empadre, el botón (+) junto a Hembras abre un selector múltiple de hembras disponibles de la especie del macho. Excluye participantes actuales, animales inactivos, gestantes, paridas y ocupadas en otros empadres activos. Agrega mediante `updateBreedingRecord`, preserva la información de las hembras existentes y mantiene la ficha abierta. Solo aparece con permiso de actualización y en empadres en curso.

La ficha de empadre incluye un botón de edición junto al estado, visible con permiso de actualización. Abre `ModalEditBreeding` con el registro actual y guarda mediante `updateBreedingRecord`, conservando la ficha y la conversación.

El botón flotante (+) incorpora una media luna azul con acceso directo al asistente IA mediante su icono. El botón central conserva las acciones de creación y el comportamiento para animales seleccionados.

El acceso de IA se superpone abajo a la izquierda del (+), en un círculo menor con una media luna de separación entre ambos botones.

Comparación temporal en UI del botón flotante: selector 1 (integrado, IA en menú), 2 (dos círculos con acceso directo IA) y 3 (cápsula con IA y creación). Pendiente elegir diseño definitivo; sustituye la media luna anterior.

Diseño definitivo elegido: opción 1, un botón (+) verde con estrellas blancas integradas. El asistente se abre desde el menú de creación. Se retira el selector temporal de la app; las tres propuestas permanecen en UI Showcase como referencia visual.

Alta simple de animales: Especie aparece primero, con la opción actual al inicio del desplegable. Recuerda localmente por usuario la última especie elegida para nuevas altas; los datos iniciales explícitos (edición y madre/parto) conservan prioridad. No altera el contrato de alta del asistente.

## Revisión y ejecución de lotes del asistente

- Respuesta `proposed_actions`: 2–10 acciones completas del catálogo, con propuestas independientes. Altas, pesos y ordeños múltiples se expresan como varias acciones; puede mezclar tipos con datos suficientes.
- Preparar no ejecuta. Si falla la preparación de un elemento, devuelve aclaración sin presentar un lote incompleto. Rechaza acciones exactamente repetidas en el mismo lote.
- Revisión completa muestra número de movimientos, campos, animales y efectos; advertencia de riesgo y aceptación explícita del usuario antes de habilitar confirmar.
- Ejecutar secuencialmente mediante `requestProposal`: get, revise con la misma acción, comparar datos y efectos revisados, confirm con la nueva revisión. Sin escrituras alternativas. Detener ante error o cambio; no ejecutar los siguientes ni revertir éxitos automáticamente.
- Mostrar comprobante por éxito y contador persistido en historial local. Reintentar requiere nueva revisión, consulta el servidor y omite lo ya confirmado. Las propuestas individuales conservan edición/cancelación y resolución de conflictos.
- El historial transmite los IDs de las propuestas del lote; el servidor consulta hasta 30 IDs recientes del chat y solo toma como éxito lo acreditado por comprobantes de la misma conversación y granja.

Recuperación de revisiones: el chat ofrece «Recuperar propuestas», una lectura autenticada de hasta 100 borradores por usuario/granja/conversación, filtrada por permisos. Permite mostrar borradores persistidos que falten en el historial local sin volver a crearlos ni ejecutarlos. Si la API anuncia un lote sin sus propuestas completas, el chat muestra un error recuperable en lugar de afirmar que preparó la revisión. En altas repetidas del mismo ID visible se presenta el borrador más reciente; nunca se combinan datos entre borradores. La confirmación se realiza aquí mismo, con las tarjetas del chat.

La recuperación de propuestas se muestra solo ante un error de carga de revisión, no como acción habitual. El modal del asistente prioriza el área de conversación: altura disponible, cabecera compacta con uso diario, sin título de conversación repetido ni fila permanente de recuperación.

Decisión vigente de UI para lotes: se retira la revisión y confirmación conjunta descrita en el primer diseño. Cada movimiento muestra directamente `ProposalCard` compacto con «Por revisar»; cada uno requiere su propia confirmación en el flujo individual existente. No hay botón de revisión global ni desplegable que oculte el acceso individual.

En escritorio, Asistente IA tiene un acceso independiente debajo de Crear nuevo en el lateral; se retira del menú desplegable de creación de escritorio. En móvil conserva el acceso desde el (+).

## Registrar muerte — habilitado, versión 2

- Entrada: `animalRefs` (1–50 referencias exactas), `date` (YYYY-MM-DD, zona de granja), `reason` del catálogo `animalDeathReasonLabels`, notas opcionales. Preguntar si falta fecha/motivo; no inventar causas. Una fecha/motivo comunes por acción; diferencias generan propuestas distintas.
- Flujo manual: `ModalAnimalDischarge` / muerte en `ModalNewRecord`; mismo servicio `createRecordMovementService.death`.
- Revisión: `OperationFields` con selector múltiple, fecha y motivo; `ProposalCard` identifica la muerte, lista animales y advierte del cambio a Muerto y conservación de historial. Para varios animales conserva la advertencia masiva.
- Permisos: `animals:read` y `animals:update`; referencias limitadas a la granja actual. Solo animales activos y fecha no futura. Revalidación dentro de transacción; el grupo completo se rechaza ante un miembro inválido, sin éxitos parciales en esa acción.
- Efectos: `status=muerto`, `statusAt`, `statusNotes`, `deathInfo` y movimiento `eventType=muerte` con motivo/notas. Historial y comprobante persistidos, reintentos idempotentes. No se eliminan fichas ni se cierran empadres/gestaciones implícitamente. El asistente aún no habilita deshacer este movimiento.

## Sanidad por grupo de animales — habilitado, versión 4

Desde la versión 4 una misma atención puede llevar varias categorías (`categories[]`, la primera también en `category`), igual que en el flujo manual.

`register_health` acepta exactamente una forma de indicar animales:

- `animalRefs`: 1 a 50 referencias explícitas, como antes.
- `animalGroup: { type?, gender? }`: todos los animales **activos** de la granja que
  cumplan los filtros; sin filtros son todos los activos.

El modelo describe el grupo y no enumera animales. El servidor resuelve los IDs
contra los datos actuales al preparar, al editar y de nuevo al confirmar; la huella
de estado impide confirmar si la granja cambió desde la revisión. Enviar ambas
formas, ninguna, o un grupo sin animales impide preparar la propuesta. Tope:
5000 animales por evento (`MAX_GROUP_ANIMALS`).

Almacenamiento sin cambio: el flujo manual y el asistente usan
`createRecordMovementService.health` → un documento `animalRecords/{id}` con
`animals: [ids]` y su comprobante `recordMovements/{id}`. No se lee ni escribe
cada animal, por eso el grupo no tiene el tope de 50.

Revisión: la tarjeta resume «N animales activos (filtros)», muestra el aviso de
movimiento masivo y la lista completa de animales incluidos, desplegable, en
«Cambios al confirmar». `OperationFields` edita especie y sexo del grupo; no
convierte un grupo en selección manual.

Límites: el grupo solo filtra por especie y sexo. Etapa, área o edad requieren
referencias explícitas. Muerte, destete, venta y gestación escriben en cada
animal dentro de una transacción y conservan el tope de 50 referencias.

## Crear recordatorio — habilitado, versión 3

- Permisos: `reminders:create`; animales opcionales resueltos por número visible dentro de la granja actual.
- Fecha `dueDate` hoy o futura (a diferencia de los movimientos). Se guarda a mediodía de la zona de la granja para conservar el día.
- Servicio compartido: `lib/domain/reminder-service.ts` (`buildReminderDocument`), usado también por `useReminders`. Documento `reminders/{proposalId}` con `animalNumbers`, `completionByAnimal` y `animalNumber` legacy. No escribe animales ni `recordMovements`. Comprobante enlaza a `/recordatorio/{id}`; reintentos idempotentes.

## Crear área — habilitado, versión 3

- Permisos: `areas:create`. Nombre único en la granja (sin distinguir mayúsculas).
- Servicio compartido: `lib/domain/farm-area-service.ts` (`buildFarmArea`), usado también por `useFarmCRUD`. Agrega `area_{proposalId}` a `farms/{farmId}.areas` conservando las existentes. No escribe animales ni `recordMovements`. El cliente añade el área al estado de Redux tras confirmar.

## Admisión y consumo de IA

Chat y lectura de aretes comparten la cuota por usuario. Cada petición debe reservar antes de llamar al modelo y liquidar con el mismo ID, o marcar su error. Gratis: tres consultas diarias iniciales, editables por administrador, también en desarrollo. Plan con regalo: balance del ciclo pagado y sus límites vigentes; créditos agotados no habilitan llamadas ilimitadas ni otras tres gratis durante ese ciclo. Se reanudan con el siguiente pago mensual acreditado.

Los grants de `aiCreditWallets/{uid}/grants` son idempotentes por suscripción/periodo; `aiUsageReservations` conserva estado y costo de cada solicitud. El webhook no habilita escrituras del asistente: las propuestas siguen requiriendo confirmación independiente. Leer/confirmar una propuesta persistida no consume una consulta nueva al modelo. El panel Admin → IA cambia la política futura; no abona por pulsar Guardar ni por cambiar el plan de un usuario manualmente.

La página /plan utiliza una tabla comparativa de planes activos con precio, rango de animales y límites de IA cargados desde la política de Admin. La API autenticada /api/billing/ai-benefits expone solo consultas diarias, tier y créditos visibles; excluye presupuesto/proporción internos. El regalo se presenta como posterior al pago y no acumulable. Se conservan los flujos de selección y Stripe existentes.

Multiplicadores de IA: Pro es la base; Rancho recibe 4× y Empresarial hasta 20×, configurables en Admin → IA. Con la base USD 5 visible/USD 1 interno, son USD 20/USD 4 para Rancho y hasta USD 100/USD 20 para Empresarial. La política limita los multiplicadores a 20. Los regalos se multiplican al acreditar el siguiente ciclo pagado y los saldos anteriores conservan sus condiciones; Empresarial requiere la facturación mensual de Stripe correspondiente al acuerdo. La comparativa muestra los importes visibles y «hasta» para Empresarial.

## Panel de conversaciones

El asistente se abre en un panel compacto a la izquierda: 380 px en escritorio y 420 px desde 1280 px. El dashboard reserva su ancho y recupera todo el espacio al cerrarlo. En móvil conserva el ancho disponible y el ajuste al teclado. El
historial se abre desde el icono junto al input y sustituye temporalmente los
mensajes, también en escritorio; no hay una segunda barra lateral dentro del
panel. «Nueva» aparece al abrir el historial. Seleccionar una conversación
restaura sus mensajes y propuestas sin ejecutar movimientos.

La presentación del dashboard usa su ancho disponible para alternar navegación
lateral e inferior; abrir el asistente puede activar la vista compacta aunque la
ventana siga teniendo ancho de escritorio.

En el formulario de venta, el selector y los pesos individuales se ordenan por
número de arete con comparación numérica natural (2 antes de 10). Los pesos
permanecen asociados al ID del animal, independientemente del orden visible.

Fotos: alta con foto principal y edición de galería desde la ficha del animal.
La compresión y conversión son del cliente; los archivos se suben a Storage y
los enlaces se guardan mediante el CRUD normal, con permiso de actualización.
El chat no tiene herramienta para adjuntar ni cargar fotos del animal.

## Editor visual de áreas

El encabezado «Áreas de {nombre de granja}» y la indicación están fuera del borde
del lienzo. `FarmMapToolbar` flota con una sola acción principal según el estado:
Terminar dibujo o Listo; Crear área aparece en la fila del encabezado. Mover permite navegar sin editar figuras.
Durante edición no aparecen Pendientes ni Crear área; ⋯ contiene Descartar
cambios y Eliminar área. Eliminar requiere confirmación y un área vacía.

La creación dibuja únicamente polígonos: al menos tres puntos y cierre sobre el
primero, o Terminar. El cierre abre el formulario sin persistir automáticamente.
Volver desde ese formulario conserva los puntos y no permite cerrar mientras se
guarda. Las áreas rectangulares existentes siguen siendo compatibles. El nombre
propone Área N, siguiente al mayor número existente (incluidas áreas inactivas).

El lienzo ampliado se centra al abrir y comienza al 100 %. Zoom −/porcentaje/+
aparece arriba a la derecha junto al encabezado, fuera del lienzo. Mapa/Tabla,
zoom y Crear área comparten una fila compacta; en tabla se oculta el zoom. Crear área en mapa inicia el dibujo y queda deshabilitado como «Creando…»; en tabla abre el modal «Nueva área» y guarda un cuadrado por defecto en el mapa (escalonado), editable después. Cambiar a tabla cancela un dibujo en curso. Permite 50–200 %, conserva el centro de la vista y no cambia datos persistidos.
Las fichas HTML están fuera del SVG. Cerradas usan una escala compacta de
65–85 % según el zoom; solo pulsarlas las abre a tamaño completo. Cerradas muestran icono, nombre y una burbuja solo numérica; al
abrir aparece la superficie en texto pequeño (p. ej. 120 m² o — m²), descripción
y animales, sin repetir nombre/conteo ni mostrar el tipo como Pastizal. No hay
un botón Editar dentro de cada ficha: se selecciona el contorno y se usa Datos.

El primer toque en un contorno lo selecciona; arrastrar el contorno ya seleccionado
lo mueve (umbral de 4 px). Los animales no disparan el arrastre de la figura.
Arrastrar el fondo o usar Mover, Espacio con foco en el lienzo o el botón central
permite desplazar ambos ejes, incluida la diagonal. Los puntos editables mantienen
una zona táctil equivalente a 44 px independientemente del zoom.

Listo guarda cambios y termina la selección; sin cambios, solo termina. Descartar
restaura el contorno persistido. Cambiar de área con cambios guarda primero y no
abandona la edición si falla. Se avisa antes de recargar/cerrar la página con
cambios o dibujos pendientes; el aviso no intercepta cambios de pestaña internos.

Pulsar un animal abre un selector de destino como alternativa a arrastrarlo.
Al elegir o soltar un movimiento normal se encola, se refleja inmediatamente en
ambas vistas y se selecciona el destino. El selector cierra sin esperar el servidor
y Pendientes permanece abierto para continuar. Durante Editar datos se mantiene
el área del formulario. El formulario conserva su ID independiente
de la selección, y Guardar datos no persiste geometría sin confirmar. Errores se
muestran dentro del diálogo; no se afirma éxito si onMoveAnimal/assignArea falla.
El arrastre HTML usa la propia ficha HTML como imagen, sin clon temporal ni SVG.

Descripción ocupa una fila completa con textarea inicialmente de una línea que
crece al escribir. Metros cuadrados y color comparten fila. La superficie manual
se guarda en FarmArea.areaM2, sin calcularla desde el polígono ni reinterpretar
capacity (capacidad histórica en animales). Los respaldos preservan ambos campos.
El contador −/+ admite decimales, repite cada 80 ms después de 400 ms de pulsación
mantenida, nunca baja de cero y parpadea mientras repite, respetando movimiento
reducido. Los temporizadores se limpian al soltar/cancelar/perder foco/desmontar.

En edición, el buscador de asignación está antes de la lista de animales, sin
bloque vacío si no hay asignados. Asignar/Quitar también encolan movimientos
optimistas; la persistencia y los errores se gestionan en TabAreas. «Sacar a todos» usa ButtonConfirm, muestra cantidad/área y
destino pendientes, bloquea doble envío y cierre mientras espera. Los movimientos
ya confirmados permanecen si falla alguno; el reintento procesa los restantes.

El chat no incorpora una nueva herramienta de creación/edición de áreas: se
mantienen los servicios de dominio y permisos existentes.

Los colores del formulario conservan los predefinidos y añaden un input color
nativo «Elegir otro color» para cualquier valor hexadecimal. Se guarda mediante
el mismo layout.color al crear o actualizar el área.


### Vista de tabla y movimientos optimistas

Mapa y tabla comparten animalsByArea y permanecen montados al alternar para
conservar zoom, desplazamiento, dibujos y filas desplegadas. La tabla resume
nombre, conteo y superficie, con animales desplegables, Datos y Ver en mapa; esta
última acción centra el contorno. Los controles de vista/zoom son compactos,
accesibles por nombre y foco y se mantienen en una fila con scroll si hace falta.

`useOptimisticAreaMoves` mantiene un overlay local por animal y una cola serial
independiente para cada animal. `moveAnimal(id, destino, false)` encola y resuelve
sin esperar el ACK: no deshabilita las fichas ni afirma que quedó guardado. Si el
servidor rechaza la intención vigente, restaura el último destino confirmado y
muestra aviso/banda persistente con Reintentar. Fallos antiguos no pisan una
intención posterior. El overlay confirmado se retira al coincidir la fuente viva o llegar un destino
remoto ajeno. Los casos ambiguos entre un snapshot retrasado y un regreso remoto
al origen conservan el overlay como máximo dos segundos después del ACK; una
petición todavía pendiente nunca caduca por ese plazo.

`moveAnimal(id, destino, true, origenEsperado)` espera la persistencia y lanza
errores; es el modo de Sacar a todos, después de confirmar. Un animal que ya
cambió de área se omite para no pisar una intención posterior. La confirmación se mantiene montada aunque
el overlay vacíe la lista antes del ACK. El servicio único sigue siendo assignArea;
la cola usa force solo para evitar no-ops con snapshots antiguos (A→B→A), y el
servicio rechaza si no hay usuario. Un cambio de granja/desmontaje aísla las
peticiones antiguas de la nueva UI. No se añade un ejecutor alternativo al chat.

Las fichas abiertas se sitúan por encima de las etiquetas cerradas; la última
abierta tiene prioridad. La lista usa filas sin compresión y scroll contenido,
muestra todos los animales y no sustituye los que pasan de doce por un «+N».


### Orden de Nuevo Registro

`/registro/nuevo` comienza en **Tipo y Fecha**, continúa con **Animales** y termina en **Detalles**. El primer paso conserva tipo, categorías y fecha (nota y sanidad admiten varias categorías: se guardan en `categories[]` y la primera queda como `category` principal; el primer toque reemplaza la preselección automática); en sanidad se pueden agregar medicamentos con nombre y lote, guardados en `medications[]`); el segundo exige al menos un animal activo antes de avanzar. Volver conserva los datos y la preselección de animales de la URL. Venta y cambio de etapa abren sus formularios en el tercer paso y vuelven al selector de animales. **Recordatorio** no es un tipo de registro: abre `/recordatorio/nuevo` (reemplaza la página) con los animales ya elegidos en `animalIds`. El orden no modifica los servicios ni la confirmación del asistente.


En Cambio de etapa, una hembra gestante muestra fecha aproximada de parto, padre y monta (código y fecha). Usa la fecha esperada guardada o la calcula desde la monta con el helper de especie. Conserva las acciones solo donde ya hay handlers conectados; no habilita movimientos nuevos.


Desde el resumen de gestación en Nuevo Registro, «Registrar parto» abre `ModalBirthForm` con la madre preseleccionada. Usa `useRecordMovements.birth` y el empadre confirmado si existe; sin empadre, usa los datos de gestación de la madre. Cancelar vuelve al resumen; cerrar tras el éxito regresa a la pantalla anterior.


Cambio de etapa muestra la tarjeta compacta del selector con `AnimalBadges` del animal seleccionado en el encabezado individual, en lugar de una línea de etapa y número. No cambia selección ni movimientos.


Cambio de etapa individual para un animal en empadre ofrece Configurar monta o Sacar del empadre, en lugar de destinos genéricos. Reutiliza ModalBreedingDetails/ModalEditBreeding y la confirmación de retirada compartida, con permisos de actualización y eliminación si retira el empadre completo. La asociación debe ser única y activa; si falta o es ambigua, pide revisarla desde Empadres.


Selector múltiple de animales (`InputSelectAnimals`) con `areas`: el encabezado del desplegable ofrece un switch «Animales | Áreas». En Áreas, el texto busca por nombre; tocar un área (o Enter) agrega sus animales `currentAreaId` que aún no estén seleccionados, respetando el filtro del selector (p. ej. hembras disponibles en empadre). Se usa en Nuevo Registro, Nuevo registro rápido (multi), Recordatorios y hembras de empadre. Solo cambia la selección del formulario; no mueve animales ni habilita acciones del asistente.

En Editar área, la asignación de animales usa el mismo `InputSelectAnimals` (búsqueda, teclado y switch «Animales | Áreas» para traer un área completa). Los animales del área se muestran como chips del mismo selector, debajo del buscador (`selectedPosition="below"`); la × los saca a pendientes de asignar y «Sacar a todos» se conserva. Mueve con `onMoveAnimal` optimista. El botón de pendientes del mapa se rotula «Animales sin asignar».
