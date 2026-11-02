---
title: Conocimiento del asistente
description: Organización propuesta de documentos estáticos y datos actuales de cada granja.
audience: llm+human
last_updated: 2026-11-01
---

# Conocimiento organizado y actualizado

Estado: **documentos por tema implementados en `lib/ai/knowledge.ts`, con recuperación iterativa controlada desde la orquestación del chat**. Volver al [plan principal](README.md).

## Dos fuentes con ciclos diferentes

**Conocimiento del producto:** documentación versionada con el código: flujos, campos, validaciones, navegación y referencias por especie. Vive en `docs/assistant/` y en los contratos ejecutables correspondientes. El catálogo tipado de `lib/ai/operations.ts` alimenta el documento de operaciones. Las instrucciones del proveedor deben consultar ese catálogo en lugar de conservar otro ejecutor o esquema de acciones.

**Datos de la granja:** documentos lógicos JSON generados al consultar Firestore, bajo la identidad y permisos actuales. No guardar copias manuales en Git ni exportar archivos de todas las granjas a una carpeta accesible por el modelo. Firestore conserva la fuente de verdad; estos archivos son vistas legibles y organizadas por tema.

No hace falta una base vectorial para saber cuántas crías hay o qué monta está activa. Son consultas estructuradas a datos actuales. Considerar búsqueda semántica posteriormente para guías extensas; nunca usar un índice semántico como autoridad para saldos, estados o permisos.

## Índice lógico implementado

| Documento | Contenido | Fuentes y cálculos |
| --- | --- | --- |
| `index` del paquete | Granja, instante de lectura, zona horaria efectiva, permisos, versiones y documentos disponibles | Acceso resuelto en servidor; catálogo de documentos. Se publica como objeto `index`, no como archivo físico |
| `granja/resumen.json` | Conteos agregados por especie, género, estado y etapa; pendientes por categoría | Cálculos vigentes de `buildAiContext`; contar el conjunto autorizado completo |
| `animales/catalogo.json` | Referencias visibles, datos esenciales, estado y relaciones | Colección `animals` filtrada por granja; etapas calculadas por las utilidades actuales |
| `animales/{referencia}.json` | Ficha y registros autorizados de un animal exacto | Resolución inequívoca del lado del servidor; ID interno nunca elegido libremente por el modelo |
| `pendientes/destetes.json` | Crías activas sin destetar, fecha estimada, días restantes, madre y motivo | `getWeaningDueDate`, `getWeaningStatus`, `isActiveCalf`; configuración real por especie |
| `reproduccion/empadres.json` | Montas activas/terminadas, macho, hembras y resultados pendientes | `breedingRecords` y animales relacionados; estado vigente y permisos de ambos módulos |
| `reproduccion/partos.json` | Gestaciones confirmadas pendientes, fechas esperadas y origen | Registros de reproducción y gestación vigente; nunca asumir un parto ocurrido |
| `produccion/leche.json` | Lactancias y ordeños del período pedido | Registros de leche y propósito real de cada madre |
| `historial/movimientos.json` | Eventos reales ordenados y enlaces a registros | Unificar las fuentes actuales, incluyendo movimientos centrales; deduplicar por identificador, no por título |
| `pendientes/recordatorios.json` | Recordatorios pendientes autorizados | Colección `reminders`; no confundir su existencia con una pestaña de navegación visible |
| `operaciones/catalogo.json` | Qué puede consultarse/prepararse/ejecutarse y versión de cada flujo | Registro tipado de operaciones y permisos efectivos de la solicitud |
| `referencias/especies.json` | Destete, gestación, edades y condiciones de referencia | `ANIMAL_BREEDING_CONFIGS` y descripciones compartidas, sin duplicar cifras en prompts |

Estas rutas son identificadores controlados del catálogo, no rutas del disco ni consultas arbitrarias construidas por el modelo.

## Lectura por consulta

1. Autenticar al usuario y resolver acceso a la granja en el servidor.
2. Preparar el índice y resumen autorizado; determinar los temas y entidades del mensaje y las referencias conversacionales necesarias.
3. Recuperar los documentos relevantes mediante herramientas de lectura con parámetros validados. La primera versión concentra la recuperación en `read_document` con una ruta del catálogo y parámetros controlados. Los nombres de herramientas especializadas (`get_animal`, `list_weaning_pending`, etc.) quedan como una posible descomposición posterior, no son endpoints que el modelo pueda inventar.
4. Devolver documentos con metadatos. Ante ambigüedad o datos insuficientes, pedir aclaración o recuperar otra página. Una frase como «sí, esa hembra» debe resolverse en la conversación y revalidarse contra datos actuales.
5. Responder con datos leídos en esta solicitud. El historial ayuda a entender la pregunta; no reemplaza la lectura vigente.
6. Antes de confirmar cualquier escritura, volver a leer las entidades involucradas y comprobar cambios relevantes. Después del resultado, invalidar vistas afectadas y refrescar el contexto.

La primera implementación usa un constructor determinista por tema (`buildAiContext` → `buildAiKnowledge`) y expone paginación mediante `options.page`: `topic`, `offset`, `limit`, con límite máximo 150. El cursor es el siguiente offset serializado. La orquestación permite lecturas internas `read_document` para solicitar documentos y páginas del catálogo, con un máximo de cuatro pasos. Las rutas y parámetros se validan; no hay lectura arbitraria de disco ni consultas de Firestore generadas por el modelo. Si el presupuesto de lectura no alcanza, debe indicarse el recorte.

La selección incluye referencias de mensajes anteriores suministradas por la ruta del chat, pero las entidades se vuelven a leer de Firestore. Una ficha `animales/{referencia}.json` aparece solo para referencias exactas presentes en la selección; los IDs internos no forman parte de esa ficha.

## Contrato de documento

Ejemplo ilustrativo del contrato, sin datos reales:

```json
{
  "path": "pendientes/destetes.json",
  "schemaVersion": 1,
  "generatedAt": "ISO-8601",
  "source": ["animals", "species-config"],
  "available": true,
  "loaded": true,
  "coverage": { "returned": 0, "total": 0, "hasMore": false, "cursor": null },
  "data": []
}
```

- `available: false` significa módulo restringido: su contenido es `null` y su total es `null`, **no cero registros**. `loaded: false` con `available: true` indica que el tema tiene acceso pero su detalle no se cargó. No afirmar ausencia a partir de ese estado.
- Un error de lectura hace fallar la consulta, en vez de transformar la fuente en una lista vacía. Esta versión no implementa respuestas parciales por fuente.
- Cada lista tiene cobertura y paginación. El total del catálogo se refiere al conjunto seleccionado (por ejemplo, referencias exactas); los totales globales de granja están en `granja/resumen.json`. Nunca inferir un total contando una página, ni afirmar «no existe» porque no apareció en los primeros resultados.
- Las cifras de resumen se calculan de forma determinista. El modelo explica resultados, no recalcula conteos a mano.
- Fechas guardadas y presentación deben respetar la política de [fechas](../features/dates.md). La zona efectiva se resuelve usando `farm.timeZone`, la zona válida enviada por el navegador o UTC; se informa en `index.timeZone`. Las fechas sin hora conservan su día y los instantes se interpretan en esa zona, nunca usando por accidente la zona del servidor.
- Metadatos de lectura no equivalen a una transacción global de toda la granja. Una operación siempre relee sus propios documentos en la transacción.
- Evitar datos personales innecesarios. Las credenciales y claves de proveedores nunca forman parte del conocimiento.

## Fuentes actuales y puntos de cambio

| Cambio del producto | Revisar |
| --- | --- |
| Campos, estado o etapa de animales | `packages/shared/src/types/animals.tsx`, `animal-utils`, `animal-registration-stages`, `buildAiContext` |
| Edades, destete o gestación de referencia | `packages/shared/src/lib/animalBreedingConfig.ts`, guía rápida y documento de referencias |
| Montas y resultados | Tipos de `breedings`, formularios, cálculos de etapa y contexto reproductivo |
| Registros centrales o reversión | `record-movements.ts`, `useRecordMovements`, lector del historial del asistente |
| Permisos | Tipos de permisos, resolutores de acceso y esquema de cada herramienta |
| Navegación | Dashboard, `QuickCreateButton`, enlaces del catálogo y guías; no conservar rutas antiguas dentro del prompt |

Fuentes de implementación: `apps/dashboard/src/lib/ai/actions.ts` (`buildAiContext`), `knowledge.ts`, `knowledge-records.ts`, `knowledge-dates.ts`, `context-relevance.ts`, `context-serialization.ts`, `time-zone.ts`, `chat-service.ts` y `system-prompt.ts`. El inventario verificable está en [manifest.json](manifest.json).

## API de integración y contenido

- `buildAiKnowledge(farmId, message, access, { farmName, timeZone, operations, page })` relee las fuentes y devuelve el paquete.
- `knowledgeContextToFiles(context, farmId, options)` proyecta un contexto ya leído sin nuevas consultas.
- `documents[path]` contiene `{ path, schemaVersion, generatedAt, source, available, loaded, coverage, data }`.
- `granja/resumen.json.data` contiene `{ resumen, accionesRecomendadas, nota }`.
- `reproduccion/empadres.json.data` contiene `{ records, confirmarGestacion }`; `reproduccion/partos.json.data` contiene los partos previstos y la orientación del flujo.
- `produccion/leche.json.data` contiene `{ resumen, animales }`.
- `historial/movimientos.json.data` es una lista de eventos deduplicados con `id`, `animales`, fecha, momento, tipo y detalle.
- Los documentos de catálogo de animales, recordatorios, especies y operaciones contienen listas. Los detalles no autorizados o no cargados son `null`.

`knowledge-records.ts` combina registros embebidos, registros centrales y comprobantes. El comprobante determina si un evento fue deshecho. Un mismo movimiento masivo se cuenta una vez y conserva la lista de animales afectados. Las gestaciones pendientes provienen de hembras activas con gestación actual; una confirmación histórica del empadre no recrea un embarazo retirado.

La confirmación de gestación pasa la zona efectiva al servicio compartido mediante `context.timeZone`; `lib/domain/farm-calendar.ts` suma días de calendario para calcular partos esperados. El adaptador manual y el del asistente usan la misma función de dominio. Cambiar este cálculo exige revisar conocimiento y flujos, no solo el texto del modelo.
