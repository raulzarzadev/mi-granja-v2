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
