---
title: Animals
description: Animal CRUD, stages (cría/destetado/adulto), AnimalSelector, ID distinction
audience: llm+human
last_updated: 2026-04-23
---

# Animals

## Types

`packages/shared/src/types/animals.tsx` — `Animal`, stage types, icons/colors/labels (single source of truth for stage display).

## ID distinction

- `animal.id` — Firestore document ID (opaque)
- `animalNumber` — human-readable (e.g., `001`, `002`), generated per type with zero-padding

Migration utility generates unique numbers per animal type.

## Hook — `useAnimalCRUD`

Standard CRUD + `updateAnimalPartial` for partial updates.

## Stage computation

Authoritative rule (confirmed 2026-04-22): `computeAnimalStage` uses `ageDays` vs `weaningDays` as the criterion. **Age wins.** Animal is `cría` only while `ageDays < weaningDays`.

## AnimalSelector — CANONICAL picker

`apps/dashboard/src/components/inputs/AnimalSelector.tsx`

**Use everywhere** an animal picker is needed. Features:
- `single` / `multi` mode
- Chips for selected
- Search dropdown
- `fixedIds` — force include/exclude
- `filterFn` — custom filter

## States in UI

- `activo` — default
- `vendido` — see [features/billing.md](./billing.md) context not applicable; see sale records
- `muerto` — dead
- `perdido` — lost (pending feature, see [roadmap.md](../roadmap.md))
- `destetado` — weaned

## Mass operations

- Registro masivo — Pro feature (gated). See [features/billing.md](./billing.md#gated-features).

## Related

- [features/breeding.md](./breeding.md) (if present)
- [GLOSSARY.md](../GLOSSARY.md)
- [features/backups.md](./backups.md) — sync rule when changing Animal type

## Fotos del animal

El alta permite seleccionar una imagen y la ficha abre «Agregar fotos» o
«Fotos (N)» para administrar hasta 12 imágenes y elegir portada. La galería se
edita en un modal con guardado persistente; requiere permiso animals:update.
Se reutiliza useAnimalCRUD.update y el namespace Storage del usuario autenticado.

`lib/animal-photo.ts` reencodifica en el navegador a WebP (JPEG como alternativa),
con proporciones y orientación conservadas, sin agrandar originales pequeños.
Lado mayor hasta 1920 px y objetivo máximo 450 KiB por foto, reduciendo primero
calidad (86–72 %) y después resolución si hace falta. El original admite hasta
50 MiB; el archivo original no se sube. La reencodificación omite EXIF/GPS.

Se intenta primero el decodificador del navegador; HEIC/HEIF y TIFF usan
conversores cargados bajo demanda si hace falta. JPEG, PNG, WebP, AVIF, GIF, BMP
y SVG dependen del decodificador nativo. Se guarda una imagen fija, no una
animación ni todas las páginas. Archivos corruptos, formatos no decodificables o
resoluciones superiores a 60 MP muestran error recuperable. No se promete soporte
para formatos RAW propietarios.

`imageUrl` identifica la portada; `imageUrls` conserva la galería. Los respaldos
incluyen las URLs, no binarios. Quitar una foto de la galería no elimina el archivo
de Storage, para conservar referencias de respaldos anteriores.

En desarrollo, Storage pasa por el mismo origen del panel (`/v0/b/*`) mediante
proxy de Next al emulador, igual que Firestore. Las imágenes locales pueden
mostrarse sin abrir orígenes adicionales en CSP ni cambiar producción.
