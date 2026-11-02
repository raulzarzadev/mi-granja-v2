---
title: Decisiones del asistente operativo
description: Registro de cambios de estrategia y su estado de implementación.
audience: llm+human
last_updated: 2026-11-01
---

# Historial de decisiones

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
