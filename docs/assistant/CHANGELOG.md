---
title: Decisiones del asistente operativo
description: Registro de cambios de estrategia y su estado de implementación.
audience: llm+human
last_updated: 2026-11-16
---

# Historial de decisiones

## 2026-11-16 — Campana con partos/destetes vencidos y Recordatorio en ModalNewRecord

La campana «Notificaciones y recordatorios» suma al contador los partos y
destetes vencidos (no los próximos) y los lista junto a los recordatorios de
hoy y vencidos. Cada aviso abre su detalle en un modal (recordatorio: completar,
editar, eliminar; parto/destete: registrar con el formulario existente) en vez
de navegar a `/recordatorio/[id]`. `ModalNewRecord` ofrece «Recordatorio», que
abre `ModalReminderForm` con los animales preseleccionados. Sin cambios en
servicios ni en operaciones del asistente.

## 2026-11-16 — Asistente IA primero en el lateral

En escritorio, el acceso Asistente IA pasa arriba de Crear nuevo. Tocarlo con
el panel abierto lo cierra (`aria-expanded` refleja el estado). Sin cambios
funcionales en operaciones ni en móvil.

## 2026-11-15 — Vista `/recordatorios`

La pestaña `?dashboard-main=recordatorios` ya no existía. Los enlaces a
recordatorios (acción recomendada del contexto operativo, correo resumen, push
y campana «Notificaciones y recordatorios» → «Ver todos») apuntan ahora a
`/recordatorios`, que muestra la lista completa. Sin cambios en operaciones.

## 2026-11-15 — Recordatorio desde Nuevo Registro

`/registro/nuevo` ofrece «Recordatorio» junto a los tipos de registro. No crea
un registro: abre `/recordatorio/nuevo` con `animalIds` y `ReminderForm`
preselecciona esos animales (`initialAnimalIds`). Sin cambios en servicios ni
en operaciones del asistente.

## 2026-11-15 — Término «Sanidad» en lugar de «Salud»

Cambio de vocabulario sin impacto funcional. El módulo, sus registros, la
operación `register_health` («Registrar sanidad»), textos de UI, landing y
documentación usan «sanidad». El prompt del sistema indica usar ese término;
la detección de contexto acepta «salud», «sanidad» y «sanitario». «Salud» se
conserva solo cuando describe la condición física de un animal (p. ej.
«problemas de salud»). Las entradas históricas de este archivo no se editan.

## 2026-11-15 — Medicamentos con lote en registros de salud

`AnimalRecord.medications?` (`{ name, batch? }[]`) guarda los productos
aplicados. Se capturan con filas «+ Agregar medicamento» en `/registro/nuevo` y
en la edición; las filas sin nombre se descartan. El campo `batch` existente se
conserva. **No habilitado** en el modal rápido ni en `register_health`.

## 2026-11-15 — Varias categorías por registro (UI manual)

`/registro/nuevo` y la edición de registros permiten elegir varias categorías en
notas y salud (p. ej. vacuna + desparasitación en la misma visita).
`AnimalRecord.categories?` guarda todas y `category` sigue siendo la principal
(la primera), así que lectores antiguos y registros previos siguen funcionando.
Listados, filtros y detalle usan `getRecordCategories`; los campos clínicos se
muestran si alguna categoría es clínica.

Extendido en el mismo cambio al modal rápido (Sanidad) y al asistente:
`HealthMovementInput.categories?` en `record-movement-service` (dedupe; la
primera queda como `category`; `details.Tipo` lista todas). `register_health`
acepta `categories[]` opcional y el flujo sube a versión 4: las propuestas
pendientes de la versión 3 dejan de ejecutarse y deben prepararse de nuevo. El
prompt indica enviar `categories` cuando una atención combina varios tipos. La revisión (`OperationFields`) usa el mismo `RecordCategoryPicker`
que el flujo manual y `ProposalCard` muestra la lista.

## 2026-11-14 — Selección de animales por área en formularios

`InputSelectAnimals` permite agregar todos los animales de un área activa desde
un switch «Animales | Áreas». Cambio solo de UI manual: no altera servicios,
movimientos, catálogo de operaciones ni conocimiento del asistente.

## 2026-11-14 — Recordatorios y áreas desde el asistente

Se habilitan `create_reminder` y `create_area` en el catálogo (versión 3). Ambos
usan servicios de dominio compartidos con el flujo manual (`reminder-service`,
`farm-area-service`); no existe implementación exclusiva del asistente.
Ninguno escribe en animales ni genera movimiento de registros.

## 2026-11-13 — Salud por grupo de animales (flujo versión 3)

Una vacunación general de 362 animales no cabía en `register_health`: el esquema
exigía enumerar referencias con tope de 50, lo que obligaba a partir un evento
en varios registros y a que el modelo escribiera cientos de IDs (costo, lentitud
y riesgo de omisiones). Se añade `animalGroup` (activos, filtro opcional por
especie y sexo): el modelo describe el grupo y el servidor resuelve la lista.
Se guarda igual que el flujo manual, un solo `animalRecords` con los IDs.

- `OPERATION_VERSION` sube a 3; las propuestas de versión 2 requieren prepararse de nuevo.
- Solo `register_health` admite grupo, porque es el único movimiento central que
  no escribe en cada animal. Los demás conservan referencias explícitas.
- Pendiente: filtros por etapa o área; no se habilitan hasta definir una fuente
  única de etapa compartida con el conocimiento que lee el modelo.
- No verificado con modelo real: la interpretación de «todos»/«las hembras» se
  cubre con el esquema y el prompt, no con pruebas de conversación.

## 2026-11-12 — Contención de reglas de producción y despliegue de imágenes

La auditoría recuperó reglas de Firestore abiertas sin autenticación y una release
de Storage con el servicio incorrecto. Se separan las reglas de producción de las
permisivas del emulador: producción requiere sesión, preservando por ahora el
acceso de clientes autenticados. Esto no constituye aislamiento por granja; sigue
pendiente una migración de autorización y protección de colecciones de servidor.
Storage usa las reglas probadas de fotos por UID/granja. Se conservan los 16
índices compuestos existentes. Las pruebas aisladas comprueban denegación de
lectura/escritura anónima y compatibilidad del acceso autenticado. No cambian
contratos de operaciones ni ejecución por Admin SDK.

## 2026-11-01 — Plan inicial

- Centralizar la estrategia en `docs/assistant/`, enlazada desde los índices e instrucciones del repositorio.
- Separar conocimiento versionado del producto y documentos dinámicos de cada granja, generados a partir de Firestore con permisos y cobertura.
- Hacer que el asistente consulte, aclare y prepare propuestas; reutilizar formularios y servicios de dominio actuales para ejecutar movimientos.
- No conectar el ejecutor antiguo de IA hasta alinear validaciones, registros, transacciones y reversión con los flujos actuales.
- Empezar con consultas y alta de animales; continuar con destetes, montas y el resto de movimientos por fases verificables.
- Mantener el historial de conversaciones actual local. La persistencia de propuestas, confirmaciones y comprobantes de ejecución se diseñará en servidor; no depender de localStorage para garantizar integridad.

Estado: documentación del plan creada; documentos dinámicos, servicios compartidos y ejecución operativa todavía pendientes.

## 2026-11-01 — Sustitución definitiva del ejecutor antiguo

Decisión del propietario: una vez implementado el nuevo sistema, el ejecutor anterior dejará de usarse. Retirar sus escrituras directas y reemplazar o eliminar la ruta que lo invoca; no dejar fallback. Conservar auditoría y movimientos históricos, invalidar propuestas antiguas pendientes y probar que las rutas nuevas no puedan invocarlo.

Estado: requisito incorporado al plan; retiro pendiente de implementar el reemplazo. Esta decisión no desactiva anticipadamente ninguna ruta.

## 2026-11-01 — Primera implementación del asistente operativo

- Documentos lógicos por tema con fuentes, permisos, fecha, estado de carga y cobertura paginada. Integración de registros centrales y comprobantes, deduplicación y reversión, referencias por especie y días de negocio por zona efectiva.
- Catálogo inicial de diez operaciones (`OPERATION_VERSION = 1`) y propuestas persistidas en servidor con revisión, vencimiento, permisos, huella del estado y comprobante de confirmación.
- Servicios de dominio compartidos con los flujos manuales para altas y movimientos. Revisión mediante tarjeta y editor tipado en el modal compartido; no se afirma reutilización completa de cada formulario manual.
- Retiro del ejecutor antiguo y rechazo de contratos anteriores con HTTP 410; historial antiguo conservado como auditoría.
- Guard local de documentación: `pnpm check:assistant-docs`, con `--base` para ramas, integrado en `pnpm review`; manifest verifica versiones e inventario. Los cambios de esquema de operaciones exigen incrementar la versión.

Estado: código implementado en la rama de trabajo, pendiente del resultado de las verificaciones de integración y pruebas de aceptación antes de publicar. Las conversaciones siguen siendo locales al navegador; las propuestas y comprobantes son del servidor.

- Auditoría de mantenimiento: el guard también vigila el prompt separado, el contrato de respuesta del modelo, la orquestación, la política de zona horaria, las conversaciones, la navegación del usuario y los flujos manuales de empadres/confirmación de gestación. `manifest.json` enumera esas fuentes operativas y los servicios de calendario compartidos.

## 2026-11-01 — OpenAI a través de OpenRouter

Decisión del propietario: conservar OpenRouter como entrada y usar la clave propia de OpenAI mediante BYOK. Cambiado el modelo por defecto a `openai/gpt-6.1-sol`, tomado del catálogo actual de OpenRouter, y restringidas las solicitudes OpenAI al proveedor interno `openai` sin fallback de hosting. No se modificaron ni copiaron credenciales. La comprobación real sigue bloqueada en OpenRouter por HTTP 404: ninguna clave BYOK puede servir el modelo; revisar habilitación, alcance de modelos/workspace y prioridad de la clave.

## 2026-11-01 — Modelo permitido por la clave BYOK

El propietario pidió usar uno de los modelos autorizados en su clave de OpenRouter. El modelo por defecto pasa a `openai/gpt-6.1-terra`, incluido en su filtro de modelos. Se mantiene la ruta OpenRouter → OpenAI y la comprobación de BYOK mediante metadatos de generación.

Verificación real: HTTP 200 con `openai/gpt-6.1-terra`, proveedor OpenAI y respuesta recibida. Las seis pruebas de configuración pasaron. La consulta de metadatos no devolvió `is_byok`; no se afirmó verificación del saldo de créditos.

## 2026-11-01 — Corrección de esquema estricto para OpenAI

La prueba real del chat devolvió HTTP 400 `invalid_json_schema`: el convertidor emitía `exclusiveMinimum: true` en lugar del límite numérico. Se normalizan esos límites sin eliminar las validaciones positivas, con prueba de regresión. Una conexión simple HTTP 200 no valida el contrato operativo completo.

Verificación posterior: la petición real a OpenRouter con GPT‑6.1 Terra, prompt y esquema operativo completo devolvió HTTP 200 y un saludo JSON válido. Pasaron nueve pruebas de respuesta/orquestación, TypeScript y el guard de documentación.

## 2026-11-01 — Cambio a Luna

A petición del propietario, el modelo por defecto pasa a `openai/gpt-6-luna-pro` (GPT-6 Luna Pro), la variante Luna autorizada en su filtro BYOK mostrado. Se conserva OpenRouter → OpenAI y el esquema operativo estricto corregido.

## 2026-11-01 — Confirmación explícita en el cuerpo del modal

El modal se titula «Confirmar acción» y destaca en su contenido la operación concreta, una explicación específica y los datos/efectos a revisar. Se conserva la confirmación única y la validación de revisión existente.

## 2026-11-01 — Fichas de animales desde menciones

El chat convierte los IDs y nombres únicos de animales de la granja actual en referencias pulsables. Abren `ModalAnimalDetails` encima del chat sin navegar ni borrar la conversación; las referencias ambiguas, ajenas o inexistentes permanecen como texto. Se evita enlazar coincidencias parciales, fechas y cantidades con unidades.

## 2026-11-01 — Consultar empadres desde el chat

Los códigos de empadre inequívocos abren un modal compacto sin cerrar la conversación. Reutiliza el modal compartido y la agrupación reproductiva actual, permite consultar sus animales y lee el registro actualizado de Redux dentro de la granja activa.

## 2026-11-01 — Acciones en la ficha de empadre del chat

Añade confirmar gestación, sacar del empadre y registrar parto según estado y permisos, con los formularios y servicios existentes. Conserva el contexto al terminar los submodales y confirma explícitamente la salida de participantes.

## 2026-11-01 — Agregar hembras desde la ficha

Botón (+) junto al contador de hembras, con selector canónico, disponibilidad, guardado compartido y error recuperable.

La acción de sacar un participante se presenta como icono X con nombre accesible y confirmación explícita posterior.

La ficha de empadre incluye un botón de edición junto al estado, visible con permiso de actualización. Abre `ModalEditBreeding` con el registro actual y guarda mediante `updateBreedingRecord`, conservando la ficha y la conversación.

El botón flotante (+) incorpora una media luna azul con acceso directo al asistente IA mediante su icono. El botón central conserva las acciones de creación y el comportamiento para animales seleccionados.

El acceso de IA se superpone abajo a la izquierda del (+), en un círculo menor con una media luna de separación entre ambos botones.

Comparación temporal en UI del botón flotante: selector 1 (integrado, IA en menú), 2 (dos círculos con acceso directo IA) y 3 (cápsula con IA y creación). Pendiente elegir diseño definitivo; sustituye la media luna anterior.

Diseño definitivo elegido: opción 1, un botón (+) verde con estrellas blancas integradas. El asistente se abre desde el menú de creación. Se retira el selector temporal de la app; las tres propuestas permanecen en UI Showcase como referencia visual.

Alta simple de animales: Especie aparece primero, con la opción actual al inicio del desplegable. Recuerda localmente por usuario la última especie elegida para nuevas altas; los datos iniciales explícitos (edición y madre/parto) conservan prioridad. No altera el contrato de alta del asistente.

## 2026-11-01 — Propuestas múltiples con revisión explícita

Contrato del proveedor ampliado con `proposed_actions` (2–10 acciones), preparación completa y tarjetas agrupadas con revisión de todos los campos y advertencia de riesgo. Confirmación secuencial sobre propuestas individuales, revalidación antes de cada paso y parada ante error/cambio. Informa éxitos parciales y conserva IDs/comprobantes para omitir guardados al reintentar. No cambia el contrato de cada operación ni promete atomicidad conjunta; se mantienen servicios y ejecutor actuales. Pruebas cubren contrato, preparación, bloqueo de confirmación sin aceptación, parada, reintentos y cambios de revisión.

Recuperación de revisiones: el chat ofrece «Recuperar propuestas», una lectura autenticada de hasta 100 borradores por usuario/granja/conversación, filtrada por permisos. Permite mostrar borradores persistidos que falten en el historial local sin volver a crearlos ni ejecutarlos. Si la API anuncia un lote sin sus propuestas completas, el chat muestra un error recuperable en lugar de afirmar que preparó la revisión. En altas repetidas del mismo ID visible se presenta el borrador más reciente; nunca se combinan datos entre borradores. La confirmación se realiza aquí mismo, con las tarjetas del chat.

La recuperación de propuestas se muestra solo ante un error de carga de revisión, no como acción habitual. El modal del asistente prioriza el área de conversación: altura disponible, cabecera compacta con uso diario, sin título de conversación repetido ni fila permanente de recuperación.

El acceso a conversaciones queda como botón de solo icono a la izquierda del campo de mensaje, disponible también al consultar el historial.

Se sustituye la revisión conjunta de lotes por revisión individual visible y compacta. Retirados el botón global, su ejecutor secuencial cliente y el desplegable por acción; se conservan las propuestas múltiples y los comprobantes individuales.

El estado «Por revisar» pasa a ser el botón que abre la revisión; eliminado el acceso duplicado «Revisar acción». Los estados terminados permanecen como etiquetas.

Al cerrar la edición de una propuesta se vuelve a su revisión, descartando cambios sin guardar; solo el cierre desde la revisión cierra «Confirmar acción».

En escritorio, Asistente IA tiene un acceso independiente debajo de Crear nuevo en el lateral; se retira del menú desplegable de creación de escritorio. En móvil conserva el acceso desde el (+).

Compactado el chat: menos separación entre mensajes, padding reducido y tarjetas con resumen/fecha junto al estado y acceso al registro, evitando huecos verticales.

La advertencia de riesgo de lotes se muestra una sola vez dentro de su tarjeta. El mensaje previo solo indica cuántos movimientos se prepararon y que aún no se guardaron. También se compacta la frase duplicada del historial existente al mostrarla.

## 2026-11-02 — Registrar muerte individual o masiva

Agrega `register_death` (1–50 animales, fecha, motivo y notas), revisión editable y efectos explícitos. Reutiliza el movimiento de muerte manual y transacción del ejecutor actual; valida actividad, permisos, fechas y referencias. No cierra gestaciones/empadres automáticamente. Catálogo/manifest suben a versión de flujo 2, invalidando borradores antiguos para nueva revisión y conservando históricos. Pruebas de equivalencia con servicio manual, actividad, fecha/motivo e idempotencia.

## 2026-11-02 — Consumo por cliente en USD

Mejora el panel existente de IA con costo USD explícito (hasta seis decimales), filtro Hoy, búsqueda de clientes, actualización y orden por costo/tokens. Identifica importes no reportados y aclara el alcance de consultas exitosas y costos BYOK. Reutiliza el endpoint y sus permisos de administrador.

## 2026-11-02 — Política de IA configurable y regalo tras pago

Configura desde Admin las consultas diarias y el tier/importes del regalo. Defaults: 3/día gratis, Pro, USD 5 visibles / USD 1 interno por ciclo mensual pagado. Abono exclusivo por invoice.paid positivo, mensual y del tier configurado; idempotencia por ciclo y no acumulación. Reservas antes del proveedor, sin bypass de desarrollo, y contabilización BYOK con costo upstream. Saldo visible separado del presupuesto interno. Proveedores sin costo o errores inciertos bloquean crédito para conciliación. El cierre del presupuesto es posterior al costo real de cada respuesta, no un tope duro de tokens/factura. Pruebas de cuotas concurrentes, idempotencia, costo no informado, configuración y eventos de pago.

Guardado de planes: mensajes de éxito/error trasladados al pie persistente junto a Guardar; mantiene valores ante rechazo de Stripe/validación, añade bloqueo de envíos duplicados y tiempo máximo de espera. Pruebas cubren feedback visible, preservación de cambios y confirmación del servidor.

Al aumentar el máximo de un plan, el formulario eleva los máximos siguientes que quedarían por debajo del nuevo mínimo, manteniendo rangos válidos antes de guardar. Normaliza ceros iniciales al salir del campo.

Planes archivados: no avanzan el contador de rangos activos en el formulario ni en la carga/validación del servidor. Sus límites históricos se conservan, los rangos activos se recalculan al reactivar y el mínimo archivado se persiste en configuración.

La página /plan utiliza una tabla comparativa de planes activos con precio, rango de animales y límites de IA cargados desde la política de Admin. La API autenticada /api/billing/ai-benefits expone solo consultas diarias, tier y créditos visibles; excluye presupuesto/proporción internos. El regalo se presenta como posterior al pago y no acumulable. Se conservan los flujos de selección y Stripe existentes.

Multiplicadores de IA: Pro es la base; Rancho recibe 4× y Empresarial hasta 20×, configurables en Admin → IA. Con la base USD 5 visible/USD 1 interno, son USD 20/USD 4 para Rancho y hasta USD 100/USD 20 para Empresarial. La política limita los multiplicadores a 20. Los regalos se multiplican al acreditar el siguiente ciclo pagado y los saldos anteriores conservan sus condiciones; Empresarial requiere la facturación mensual de Stripe correspondiente al acuerdo. La comparativa muestra los importes visibles y «hasta» para Empresarial.

Decisión de alcance: mantener los créditos incluidos por plan. La compra de créditos adicionales se implementará después; no hay recargas ni cobro por excedentes habilitados en esta entrega.

## 2026-11-12 — Sesión y emuladores

La portada comprueba la sesión del panel mediante un puente de origen validado y muestra un esqueleto mientras espera. La inicialización compartida limita a 15 segundos la espera de Firebase/perfil, muestra un error recuperable y descarta lecturas antiguas tras logout. En desarrollo Firestore y Storage usan proxies del mismo origen para evitar errores de conexión en Safari; producción conserva sus conexiones. El resto del panel mantiene protección contra iframes.

## 2026-11-12 — Consumo y renovación de IA

La página /plan muestra créditos incluidos, usados, disponibles y próxima renovación (o consultas diarias). El endpoint autenticado /api/billing/ai-usage respeta la suplantación administrativa y excluye costos internos. Gratis reinicia a medianoche de Mazatlán; créditos se reponen tras el próximo pago mensual confirmado y una renovación cancelada no promete nuevos abonos. El listener de pnpm dev:emu incluye invoice.paid. Volver desde /plan navega directamente al panel, sin regresar a Stripe.

## 2026-11-12 — Asistente lateral y presentación adaptable

El asistente abre en un panel izquierdo de 380–420 px; el dashboard ocupa el espacio restante a su derecha. Tiene cierre, Escape y ajuste al teclado. El historial sigue alternándose desde el icono junto al input. Cabecera, navegación y selector de granja responden al ancho disponible mediante container queries. La barra compacta muestra saldo con detalles desplegables a todo el ancho, sin duplicar avisos ni cerrarse al actualizar el consumo.

## 2026-11-12 — Negritas en el chat

Las respuestas interpretan **negritas** como strong, conservando menciones y enlaces seguros. El HTML recibido del modelo sigue siendo texto, sin ejecutarse.

## 2026-11-12 — Carga de respaldos por arrastre

La zona de carga admite un único JSON por selección o arrastre, hasta 50 MB, con realce y estado de procesamiento. Usa el validador existente, bloquea cargas simultáneas, permite reintento y solo abre la revisión; no restaura automáticamente.

## 2026-11-12 — Genealogía por edad y parto

Los hijos se ordenan de mayor a menor edad, con edades desconocidas al final. Los chips se agrupan por parto documentado y se separan con una línea discreta. Se reconocen offspring de empadres, eventos de nacimiento importados y documentos creados en movimientos actuales de la madre, incluso sin empadre. No se infiere una camada solo por la misma edad y se ignoran partos deshechos.

## 2026-11-12 — Animales de venta ordenados

Selector, animales elegidos, pesos individuales y partidas guardadas usan orden numérico natural por arete (2 antes de 10). Cada peso permanece asociado al ID correcto.

## 2026-11-12 — Búsqueda tolerante de aretes

Las variantes 317A, 317a, 317 A y 317-A encuentran el mismo arete, también entre animales inactivos cargados. Las consultas con números buscan número/nombre o un ID completo; no coinciden con fechas, cantidades o referencias internas en notas. Las búsquedas textuales de raza/especie/notas se conservan. Los resultados asíncronos antiguos se filtran con la consulta vigente.

## 2026-11-12 — Fotos de animales comprimidas

La ficha permite hasta 12 fotos y selección de portada; el alta optimiza la foto principal. El cliente convierte a WebP/JPEG con orientación/proporción conservadas, sin agrandar fotos pequeñas: originales hasta 50 MiB, lado mayor hasta 1920 px y objetivo hasta 450 KiB. HEIC/HEIF y TIFF usan conversores bajo demanda; se conserva una imagen fija y se muestran errores recuperables. imageUrl/imageUrls se guardan mediante el CRUD existente con permisos normales y los respaldos conservan URLs, no archivos binarios. No se agregan herramientas de fotos al asistente. Validación conjunta: 398 pruebas del dashboard, TypeScript y guard de documentación.

## 2026-11-12 — Dibujo de áreas con herramientas flotantes

El editor manual crea solo polígonos y abre los datos del área al cerrar sobre
el primer vértice, tras marcar al menos tres puntos. Se retira Cuadrado y el cierre
por doble clic; se permite deshacer el último punto. La barra flota sobre el
lienzo ampliado y centrado, conservando la compatibilidad de áreas existentes.
No se añade una operación de creación de áreas al catálogo del asistente.

El formulario del editor propone nombres Área 1, Área 2… según la numeración
existente de la granja; conserva la edición manual antes de guardar.

El campo Capacidad se sustituye en formularios de áreas por Metros cuadrados,
con contador −/+ y entrada decimal. Se agrega `FarmArea.areaM2`, se actualizan
las tarjetas y el formato/documentación de respaldos, y se conservan los valores
históricos de capacity sin reinterpretarlos. La superficie es manual, no
calculada desde el polígono. Prueba de respaldo para independencia de unidades.

Los detalles de cada área del lienzo se colapsan inicialmente y se abren desde
el nombre con una flecha, dejando libre el dibujo.

Formularios compactos de áreas: descripción autoexpandible a todo el ancho,
superficie y color en una fila, buscador antes de animales asignados y sin bloque
vacío cuando no hay animales. Se conserva la etiqueta accesible del buscador.

Contador de m² con repetición por pulsación mantenida y parpadeo del signo activo;
se limpian los temporizadores al soltar, cancelar, perder foco o desmontar. Se
comprueban clic simple, repetición sin salto extra al soltar, mínimo cero y limpieza.

Sacar a todos requiere confirmación explícita con cantidad, nombre del área y
destino. Reutiliza onMoveAnimal/assignArea; propaga fallos al diálogo para no
cerrarlo como éxito si faltan movimientos. ButtonConfirm bloquea doble envío y
cierre mientras espera la operación.

El lienzo permite arrastrar el fondo, usar Mano, Espacio + arrastrar o el botón
central del ratón para desplazar la vista. La captura del puntero termina al
soltar/cancelar/perder foco y evita mover figuras o añadir puntos al navegar.

Se combinan las acciones de edición del contorno: Listo guarda y termina; el menú
⋯ contiene Descartar cambios. Sin cambios, Listo permite salir sin escrituras.
La edición permanece abierta si el guardado falla.

El arrastre de animales usa una copia visual del chip como drag image, fuera del
SVG y del recorte de las listas, conservando su escala, número e iconos. La copia
se retira tras generar la imagen o terminar el arrastre; no modifica los animales.


## 2026-11-13 — Simplificación del editor de áreas y revisión con Claude

Revisión UX de solo lectura por Claude aplicada a barra flotante, fichas HTML
fuera del SVG, objetivos táctiles, foco y alternativa a arrastrar. El título y
la indicación quedan fuera del lienzo, con el nombre real de la granja. El zoom
50–200 % conserva el centro y el tamaño de las fichas; el contador es solo una
burbuja numérica y los m² aparecen en pequeño únicamente al abrir.

Se confirma la eliminación, se propagan errores de asignación y se selecciona
el área destino solo tras mover correctamente. Se fija la identidad del formulario
de datos para impedir escrituras sobre otro área al mover un animal; guardar
color/datos usa la geometría persistida sin confirmar el contorno local. Volver
desde guardar dibujo conserva puntos. La recarga avisa si hay cambios pendientes.
Pruebas de interacción cubren destino, fallo, confirmación de borrado, identidad
del formulario, zoom centrado y superficie solo expandida. No cambia el catálogo
de operaciones del asistente.

Los controles de zoom quedan arriba a la derecha del encabezado, fuera del
lienzo, sin cruzarse con las herramientas flotantes.

Las etiquetas cerradas quedan compactas (65–85 % según zoom); únicamente se
amplían al pulsarlas y vuelven a su tamaño pequeño al cerrar.

Se añade selector nativo de color personalizado a crear/editar áreas junto a la
paleta, con etiqueta accesible y vista del color actual.


## 2026-11-13 — Tabla de áreas y movimientos optimistas revisados con Claude

Selector Mapa/Tabla compacto junto al zoom y Crear área; en tabla se oculta el
zoom. Las dos vistas conservan su estado y comparten asignaciones/conteos. La
tabla permite expandir animales, editar los datos y centrar un área en el mapa.

Movimientos normales se reflejan al encolar, cierran el selector y permiten
continuar. useOptimisticAreaMoves serializa por animal con versiones, rollback al
último ACK y avisos recuperables con Reintentar; varios animales avanzan de forma
independiente. Sacar a todos mantiene espera real, confirmación y propagación de
error; su diálogo no se desmonta al quedar temporalmente vacío por el overlay.
assignArea sigue siendo el servicio de escritura y añade force contra snapshots
obsoletos, además de rechazar sin usuario. Subagentes implementaron UI/colas y
Claude revisó diseño y riesgos. Se prueban carreras, rollback/retry, cambio de
granja, modo estricto, selector inmediato y preservación de ambas vistas.

La revisión final de Claude añade guardia de origen esperado al vaciar un área
y libera overlays ante actualizaciones remotas o animales que salen de la fuente,
para no revertir intenciones nuevas ni ocultar cambios de otros dispositivos.

Se corrigen solapamientos de fichas del mapa: panel abierto por encima de las
etiquetas cerradas y prioridad a la última abierta. Lista en filas sin compresión,
scroll propio y todos los animales accesibles, incluido el decimotercero.


## 2026-11-14 — Historial administrativo de consultas

- Nuevas preguntas/respuestas de chat persistidas por usuario, granja y conversación, con estados pendiente/completado/fallido y sin duplicar el historial enviado por el cliente.
- «Uso de IA» en Admin → Usuarios y «Ver historial» en consumo comparten un modal paginado con fecha, granja y modelo. Lectura exclusiva de administradores y sin recuperación retroactiva.
- Se excluye `aiChatHistory` de las reglas generales de clientes; desplegar reglas antes de activar el registro. No cambia la ejecución de propuestas ni el historial local del usuario.


## 2026-11-14 — Tipo y fecha antes de animales

- Nuevo Registro vuelve al orden Tipo y Fecha → Animales → Detalles. Se conservan los datos al retroceder, la preselección y la validación de animales activos. Venta y etapa mantienen sus formularios en Detalles.


## 2026-11-14 — Resumen de gestación en Cambio de etapa

Se reemplaza el mensaje sin acciones disponibles por fecha aproximada de parto, padre y monta asociada, con estados explícitos para datos faltantes o ambiguos. No se habilitan acciones nuevas.


## 2026-11-14 — Registrar parto desde Nuevo Registro

Se conecta el botón Registrar parto del resumen de gestación al formulario compartido, con madre preseleccionada y empadre asociado si está disponible. Conserva el resumen al cancelar y los errores en el formulario.


## 2026-11-14 — Tarjeta del animal en Cambio de etapa

El encabezado individual reutiliza la tarjeta compacta del selector (`AnimalBadges`, con edad redondeada) para mostrar la identidad y etapa del animal antes de elegir un destino o registrar parto.


## 2026-11-14 — Acciones de empadre en Cambio de etapa

Se sustituyen destinos genéricos por Configurar monta y Sacar del empadre para animales individuales en empadre, con confirmación y permisos del flujo compartido.
