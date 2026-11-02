# Instrucciones del proyecto

La documentación canónica está en [docs/README.md](docs/README.md). Consultar también las convenciones de [CLAUDE.md](CLAUDE.md).

## Asistente operativo

- Antes de modificar el asistente o un flujo que utiliza, leer [docs/assistant/README.md](docs/assistant/README.md).
- Si cambian formularios de animales/registros/empadres, validaciones, fuentes de datos, permisos, fechas o navegación, revisar su impacto en [el catálogo de flujos](docs/assistant/flows.md) y [el mapa de conocimiento](docs/assistant/knowledge.md).
- Actualizar documentación, contratos afectados y pruebas en el mismo cambio. Registrar decisiones en [CHANGELOG.md](docs/assistant/CHANGELOG.md). Ejecutar `pnpm check:assistant-docs` (o `pnpm check:assistant-docs --base <referencia>` para una rama completa); también forma parte de `pnpm review`.
- Reutilizar servicios de dominio y movimientos de la app; no crear escrituras paralelas exclusivas del asistente ni afirmar éxito sin un comprobante persistido.
- Mantener explícita la diferencia entre estrategia propuesta, preparación de una acción y ejecución habilitada.
