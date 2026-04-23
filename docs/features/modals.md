---
title: Modal System
description: Base Modal + domain-specific wrappers + useModal hook
audience: llm+human
last_updated: 2026-04-23
---

# Modal System

## Pattern

```
<Modal />                  # base component
  ↑
useModal()                 # hook (open/close state)
  ↑
Domain wrappers            # e.g., ModalAnimalForm, ModalBreedingForm, ModalCreateFarm
```

## Base

`apps/dashboard/src/components/Modal.tsx` — accessible modal wrapper.

## Hook — `useModal`

```ts
const { isOpen, open, close, toggle } = useModal()
```

## Domain wrappers

Each wrapper composes:
- `<Modal>` base
- A decoupled form component (can be reused standalone)
- Optional trigger button

Examples:
- `ModalAnimalForm`
- `ModalBreedingForm`
- `ModalCreateFarm`
- `ModalInviteCollaborator`
- `ModalUpgradePlan` (see [features/billing.md](./billing.md))
- `ModalRestoreBackup` (see [features/backups.md](./backups.md))

## Form library

`react-hook-form` + Zod schemas for validation.

## Rule

Forms must be **decoupled from modal wrappers** — usable inline or inside a modal.
