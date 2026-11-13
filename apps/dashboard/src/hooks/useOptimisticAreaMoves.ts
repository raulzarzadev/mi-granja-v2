'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Animal } from '@/types/animals'

const UNASSIGNED_AREA_ID = '__unassigned__'

type AreaId = string | null
export interface AreaMoveFailure {
  animalId: string
  animalNumber: string
  areaId: AreaId
  version: number
}
interface Overlay {
  areaId: AreaId
  version: number
  confirmed: boolean
}
interface MoveScope {
  id: string
  version: number
  latest: Map<string, number>
  confirmed: Map<string, AreaId>
  overlays: Map<string, Overlay>
  failures: Map<string, AreaMoveFailure>
  queues: Map<string, Promise<void>>
  strictWaits: Map<string, number>
  knownAreas: Map<string, Set<AreaId>>
  releaseTimers: Map<string, ReturnType<typeof setTimeout>>
}
interface MoveView {
  scope: MoveScope
  overlays: Map<string, Overlay>
  failures: AreaMoveFailure[]
  savingIds: Set<string>
}
type PersistArea = (
  animalId: string,
  areaId: AreaId,
  options?: { force?: boolean },
) => Promise<void>

function createScope(id: string): MoveScope {
  return {
    id,
    version: 0,
    latest: new Map(),
    confirmed: new Map(),
    overlays: new Map(),
    failures: new Map(),
    queues: new Map(),
    strictWaits: new Map(),
    knownAreas: new Map(),
    releaseTimers: new Map(),
  }
}
function snapshot(scope: MoveScope): MoveView {
  return {
    scope,
    overlays: new Map(scope.overlays),
    failures: [...scope.failures.values()],
    savingIds: new Set([...scope.strictWaits].filter(([, count]) => count > 0).map(([id]) => id)),
  }
}

/** Normal moves enqueue immediately. Strict moves resolve only after server acknowledgement. */
export function useOptimisticAreaMoves({
  scopeId,
  animals,
  persistArea,
  onFailure,
}: {
  scopeId: string
  animals: Animal[]
  persistArea: PersistArea
  onFailure?: (failure: AreaMoveFailure) => void
}) {
  const runtime = useRef<MoveScope>(createScope(scopeId))
  if (runtime.current.id !== scopeId) {
    for (const timer of runtime.current.releaseTimers.values()) clearTimeout(timer)
    runtime.current = createScope(scopeId)
  }
  const inputs = useRef({ animals, persistArea, onFailure })
  inputs.current = { animals, persistArea, onFailure }
  const mounted = useRef(true)
  const [view, setView] = useState<MoveView>(() => snapshot(runtime.current))
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      for (const timer of runtime.current.releaseTimers.values()) clearTimeout(timer)
      runtime.current.releaseTimers.clear()
    }
  }, [])
  const publish = useCallback((scope: MoveScope) => {
    if (mounted.current && runtime.current === scope) setView(snapshot(scope))
  }, [])
  const scheduleRelease = useCallback(
    (scope: MoveScope, animalId: string, version: number) => {
      const previous = scope.releaseTimers.get(animalId)
      if (previous) clearTimeout(previous)
      if (!mounted.current || runtime.current !== scope) return
      scope.releaseTimers.set(
        animalId,
        setTimeout(() => {
          scope.releaseTimers.delete(animalId)
          const overlay = scope.overlays.get(animalId)
          if (runtime.current !== scope || !overlay?.confirmed || overlay.version !== version)
            return
          // Area values alone cannot distinguish a delayed origin from a remote return to it.
          // After ACK, retain that ambiguous overlay for at most two seconds, then trust live data.
          scope.overlays.delete(animalId)
          scope.knownAreas.delete(animalId)
          const live = inputs.current.animals.find((animal) => animal.id === animalId)
          if (live) scope.confirmed.set(animalId, live.currentAreaId ?? null)
          else {
            scope.confirmed.delete(animalId)
            scope.failures.delete(animalId)
          }
          publish(scope)
        }, 2000),
      )
    },
    [publish],
  )

  // Keep an acknowledged overlay until live data catches up or reports an unrelated location.
  // Earlier destinations in this local queue can arrive late and are not remote overrides.
  useEffect(() => {
    const scope = runtime.current
    let changed = false
    const clearRelease = (animalId: string) => {
      const timer = scope.releaseTimers.get(animalId)
      if (timer) clearTimeout(timer)
      scope.releaseTimers.delete(animalId)
    }
    const liveIds = new Set(animals.map((animal) => animal.id))
    for (const [animalId, overlay] of scope.overlays) {
      if (overlay.confirmed && !liveIds.has(animalId)) {
        scope.overlays.delete(animalId)
        scope.confirmed.delete(animalId)
        scope.knownAreas.delete(animalId)
        scope.failures.delete(animalId)
        clearRelease(animalId)
        changed = true
      }
    }
    for (const animal of animals) {
      const actual = animal.currentAreaId ?? null
      const overlay = scope.overlays.get(animal.id)
      if (
        overlay?.confirmed &&
        (overlay.areaId === actual || !scope.knownAreas.get(animal.id)?.has(actual))
      ) {
        scope.overlays.delete(animal.id)
        scope.knownAreas.delete(animal.id)
        scope.confirmed.set(animal.id, actual)
        clearRelease(animal.id)
        changed = true
      }
      if (!scope.overlays.has(animal.id) && !scope.queues.has(animal.id))
        scope.confirmed.set(animal.id, actual)
    }
    if (changed) publish(scope)
  }, [animals, view, scopeId, publish])

  const moveAnimal = useCallback(
    (
      animalId: string,
      requestedAreaId: string,
      waitForPersistence = false,
      expectedFromAreaId?: AreaId,
    ): Promise<void> => {
      const scope = runtime.current
      const animal = inputs.current.animals.find((item) => item.id === animalId)
      if (!animal || (animal.farmId && animal.farmId !== scope.id))
        return Promise.reject(new Error('El animal ya no está disponible en esta granja.'))
      const nextAreaId = requestedAreaId === UNASSIGNED_AREA_ID ? null : requestedAreaId
      const existing = scope.overlays.get(animalId)
      const currentAreaId = existing ? existing.areaId : (animal.currentAreaId ?? null)
      if (expectedFromAreaId !== undefined && currentAreaId !== expectedFromAreaId)
        return Promise.resolve()
      const waitStrictly = async (task: Promise<void>) => {
        scope.strictWaits.set(animalId, (scope.strictWaits.get(animalId) ?? 0) + 1)
        publish(scope)
        try {
          await task
        } finally {
          const count = (scope.strictWaits.get(animalId) ?? 1) - 1
          if (count > 0) scope.strictWaits.set(animalId, count)
          else scope.strictWaits.delete(animalId)
          publish(scope)
        }
      }
      if (currentAreaId === nextAreaId) {
        const pending = scope.queues.get(animalId)
        return waitForPersistence && pending ? waitStrictly(pending) : Promise.resolve()
      }
      const version = ++scope.version
      const previousRelease = scope.releaseTimers.get(animalId)
      if (previousRelease) clearTimeout(previousRelease)
      scope.releaseTimers.delete(animalId)
      // Include origins observed at each new intention, not unrelated source changes afterward.
      const knownAreas = scope.knownAreas.get(animalId) ?? new Set<AreaId>()
      knownAreas.add(animal.currentAreaId ?? null)
      knownAreas.add(currentAreaId)
      knownAreas.add(nextAreaId)
      scope.knownAreas.set(animalId, knownAreas)
      if (!scope.confirmed.has(animalId))
        scope.confirmed.set(animalId, animal.currentAreaId ?? null)
      scope.latest.set(animalId, version)
      scope.overlays.set(animalId, { areaId: nextAreaId, version, confirmed: false })
      scope.failures.delete(animalId)
      publish(scope)
      // Capture the authorized service for this scope. force bypasses only stale-snapshot no-ops.
      const persist = inputs.current.persistArea
      const previous = scope.queues.get(animalId) ?? Promise.resolve()
      const task = previous
        .catch(() => undefined)
        .then(async () => {
          try {
            if (expectedFromAreaId !== undefined) {
              const live =
                runtime.current === scope
                  ? inputs.current.animals.find((item) => item.id === animalId)
                  : undefined
              const remoteChanged =
                live &&
                (live.currentAreaId ?? null) !== expectedFromAreaId &&
                !knownAreas.has(live.currentAreaId ?? null)
              if (
                scope.latest.get(animalId) !== version ||
                scope.confirmed.get(animalId) !== expectedFromAreaId ||
                remoteChanged
              ) {
                if (scope.latest.get(animalId) === version) {
                  const areaId = remoteChanged
                    ? (live.currentAreaId ?? null)
                    : (scope.confirmed.get(animalId) ?? null)
                  scope.overlays.set(animalId, { areaId, version, confirmed: true })
                  scheduleRelease(scope, animalId, version)
                }
                return
              }
            }
            await persist(animalId, nextAreaId, { force: true })
            scope.confirmed.set(animalId, nextAreaId)
            if (scope.latest.get(animalId) === version) {
              scope.overlays.set(animalId, { areaId: nextAreaId, version, confirmed: true })
              scope.failures.delete(animalId)
              scheduleRelease(scope, animalId, version)
            }
          } catch (error) {
            // An obsolete failure must never roll back a more recent user intention.
            if (scope.latest.get(animalId) === version) {
              scope.overlays.set(animalId, {
                areaId: scope.confirmed.get(animalId) ?? null,
                version,
                confirmed: true,
              })
              scheduleRelease(scope, animalId, version)
              const failure = {
                animalId,
                animalNumber: animal.animalNumber,
                areaId: nextAreaId,
                version,
              }
              scope.failures.set(animalId, failure)
              if (mounted.current && runtime.current === scope) inputs.current.onFailure?.(failure)
            }
            throw error
          } finally {
            publish(scope)
          }
        })
      scope.queues.set(animalId, task)
      const clean = () => {
        if (scope.queues.get(animalId) === task) scope.queues.delete(animalId)
      }
      void task.then(clean, clean)
      if (waitForPersistence) return waitStrictly(task)
      // Errors are surfaced by the recoverable failure list, not as unhandled rejections.
      void task.catch(() => undefined)
      return Promise.resolve()
    },
    [publish, scheduleRelease],
  )

  const retry = useCallback(
    (failure: AreaMoveFailure) => {
      const current = runtime.current.failures.get(failure.animalId)
      if (!current || current.version !== failure.version) return Promise.resolve()
      return moveAnimal(failure.animalId, failure.areaId ?? UNASSIGNED_AREA_ID)
    },
    [moveAnimal],
  )
  const dismissFailure = useCallback(
    (animalId: string) => {
      runtime.current.failures.delete(animalId)
      publish(runtime.current)
    },
    [publish],
  )
  const current = view.scope === runtime.current ? view : snapshot(runtime.current)
  const visibleAnimals = useMemo(
    () =>
      animals.map((animal) => {
        const overlay = current.overlays.get(animal.id)
        return overlay ? { ...animal, currentAreaId: overlay.areaId } : animal
      }),
    [animals, current.overlays],
  )
  return {
    visibleAnimals,
    moveAnimal,
    retry,
    dismissFailure,
    failures: current.failures,
    savingIds: current.savingIds,
  }
}
