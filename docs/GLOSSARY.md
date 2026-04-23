---
title: Glossary — Vocabulario Ganadero
description: Spanish domain vocabulary used in UI and code. Use these terms, not anglicisms.
audience: llm+human
last_updated: 2026-04-23
---

# Glossary — Vocabulario Ganadero

All UI text uses Spanish (Mexico/LatAm) with ganadero vocabulary. Use these terms; avoid anglicisms.

## Animales

| Término        | Significado                                      | No usar         |
|----------------|--------------------------------------------------|-----------------|
| animal, res    | Animal individual                                | entity, resource|
| ganado         | Conjunto de animales                             | livestock (en UI)|
| cría           | Animal recién nacido                             | offspring, baby |
| hembra, vaca   | Animal hembra adulto                             | female          |
| macho, toro    | Animal macho adulto                              | male            |
| becerro        | Cría bovina                                      | calf            |
| novilla        | Hembra joven no parida                           | heifer          |
| arete          | Identificación física del animal                 | tag, ID         |

## Reproducción

| Término      | Significado                                | No usar          |
|--------------|--------------------------------------------|------------------|
| monta        | Acto reproductivo                          | mating, breeding event |
| empadre      | Período/grupo de montas                    | breeding season  |
| parto        | Nacimiento                                 | birth event      |
| destete      | Separar cría de madre                      | weaning          |

## Manejo

| Término          | Significado                         | No usar        |
|------------------|-------------------------------------|----------------|
| corral, potrero  | Espacio físico para animales        | zone, section  |
| área             | Subdivisión de granja               | region         |
| vacunación       | Aplicar vacuna                      | immunization   |
| desparasitación  | Aplicar antiparasitario             | deworming (ok en doc) |
| herraje          | Colocar herradura                   | horseshoeing   |

## Sistema

| Término           | Significado                              | No usar           |
|-------------------|------------------------------------------|-------------------|
| granja            | Unidad principal (multi-tenant)          | farm, tenant      |
| registro, apunte  | Entrada de datos                         | record, entry     |
| recordatorio      | Pendiente con fecha                      | reminder, task    |
| colaborador       | Usuario con permisos en granja           | user, member      |
| vaquero, encargado| Rol operativo                            | worker            |

## Estados de animal

- **activo** — en granja
- **vendido** — registrado como venta
- **muerto** — fallecido
- **perdido** — no ubicado (feature pendiente)
- **destetado** — separado de la madre

## UI actions (Spanish)

| Acción         | No usar          |
|----------------|------------------|
| Guardar        | Submit, Save (en botón) |
| Cancelar       | Dismiss          |
| Eliminar       | Delete, Remove   |
| Registrar      | Create, Add      |
| Buscar         | Filter, Search (en label) |
| Volver         | Back             |

## Plans

- **Free** — 1 granja, 0 colaboradores
- **Pro** — admin asigna N `places` (cada uno = 1 granja extra O 1 colaborador)
- **Lugares** — unidad de capacidad en plan Pro
