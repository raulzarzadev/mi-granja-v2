---
title: Farms & Invitations
description: Multi-tenant farm model with invitation lifecycle
audience: llm+human
last_updated: 2026-04-23
---

# Farms & Invitations

## Redux slice — `farm`

```ts
{
  myFarms: Farm[],           // farms owned by user
  invitationFarms: Farm[],   // farms where user is invited/collaborator
  currentFarm: Farm | null,
  ...
}
```

## Farm creation

- Component: `ModalCreateFarm`
- Crear granjas no consume cuota de billing; el cobro se basa en animales activos.
- See [features/billing.md](./billing.md) for quota enforcement.

## Invitations

Firestore collection: `farmInvitations`.

Status lifecycle:
- `pending` — sent, awaiting response
- `accepted` — user joined
- `rejected` — user declined
- `expired` — timed out
- `revoked` — admin/manager cancelled

## Actions

| Action   | Who                                    |
|----------|----------------------------------------|
| Accept   | Invited user                           |
| Reject   | Invited user                           |
| Revoke   | Admin/manager with `update` permission |
| Delete   | Only `delete` permission on collaborators |

## UI — FarmSwitcherBar

Groups:
- "Mis Granjas" — owned
- "Invitaciones y Accesos" — invited

Icons: ⏳ pendiente, ✅ aceptada. Shows role per farm.

## Invitation flow component

`ModalInviteCollaborator` — invita por correo; los colaboradores no consumen cuota de billing.

## Pending

- Collaborators UX rework — own invitation/management flow (see [roadmap.md](../roadmap.md)).

## Related

- [features/permissions.md](./permissions.md)
- [features/billing.md](./billing.md)
