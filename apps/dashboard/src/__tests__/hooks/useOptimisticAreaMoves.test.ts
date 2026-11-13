import { act, renderHook } from '@testing-library/react'
import { useOptimisticAreaMoves } from '@/hooks/useOptimisticAreaMoves'
import type { Animal } from '@/types/animals'

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const a = {
  id: 'animal-a',
  animalNumber: '233',
  farmId: 'farm-a',
  currentAreaId: 'area-a',
} as Animal
const b = {
  id: 'animal-b',
  animalNumber: '234',
  farmId: 'farm-a',
  currentAreaId: 'area-a',
} as Animal
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

it('moves immediately without blocking the chip, then releases its overlay once the live source catches up', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
  expect(result.current.savingIds.size).toBe(0)
  expect(persistArea).toHaveBeenCalledWith(a.id, 'area-b', { force: true })
  await act(async () => {
    pending.resolve()
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
  rerender({ animals: [{ ...a, currentAreaId: 'area-b' }] })
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
})

it('rolls back a failed move and retries the same destination without blocking interaction', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const onFailure = jest.fn()
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea, onFailure }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  await act(async () => {
    first.reject(new Error('offline'))
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-a')
  expect(result.current.failures).toEqual([
    expect.objectContaining({ animalId: a.id, areaId: 'area-b' }),
  ])
  expect(onFailure).toHaveBeenCalledTimes(1)
  await act(async () => {
    await result.current.retry(result.current.failures[0])
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
  expect(result.current.failures).toHaveLength(0)
  await act(async () => {
    second.resolve()
    await flush()
  })
})

it('serializes two rapid moves of one animal and ignores an obsolete failure', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const onFailure = jest.fn()
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea, onFailure }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
    await result.current.moveAnimal(a.id, 'area-c')
  })
  expect(persistArea).toHaveBeenCalledTimes(1)
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
  await act(async () => {
    first.reject(new Error('old request failed'))
    await flush()
  })
  expect(persistArea).toHaveBeenCalledTimes(2)
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
  expect(result.current.failures).toHaveLength(0)
  expect(onFailure).not.toHaveBeenCalled()
  await act(async () => {
    second.resolve()
    await flush()
  })
})

it('rolls back to the latest acknowledged area instead of the original area when a later move fails', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
    await result.current.moveAnimal(a.id, 'area-c')
  })
  await act(async () => {
    first.resolve()
    await flush()
  })
  await act(async () => {
    second.reject(new Error('offline'))
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
  expect(result.current.failures[0].areaId).toBe('area-c')
})

it('persists A to B to A in order even while the source still reports A', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
    await result.current.moveAnimal(a.id, 'area-a')
  })
  await act(async () => {
    first.resolve()
    await flush()
  })
  expect(persistArea.mock.calls).toEqual([
    [a.id, 'area-b', { force: true }],
    [a.id, 'area-a', { force: true }],
  ])
  await act(async () => {
    second.resolve()
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-a')
})

it('moves different animals independently and supports moving to pending', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a, b], persistArea }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, '__unassigned__')
    await result.current.moveAnimal(b.id, 'area-c')
  })
  expect(persistArea).toHaveBeenCalledTimes(2)
  expect(result.current.visibleAnimals.map((animal) => animal.currentAreaId)).toEqual([
    null,
    'area-c',
  ])
  await act(async () => {
    first.resolve()
    second.resolve()
    await flush()
  })
})

it('strict callers wait for acknowledgement and receive rejection with their chip blocked', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
  )
  let settled = false
  let error: unknown
  act(() => {
    void result.current.moveAnimal(a.id, '__unassigned__', true).then(
      () => {
        settled = true
      },
      (reason) => {
        settled = true
        error = reason
      },
    )
  })
  await act(flush)
  expect(settled).toBe(false)
  expect(result.current.savingIds.has(a.id)).toBe(true)
  await act(async () => {
    pending.reject(new Error('offline'))
    await flush()
  })
  expect(settled).toBe(true)
  expect(error).toBeInstanceOf(Error)
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-a')
  expect(result.current.savingIds.size).toBe(0)
})

it('does not notify or roll back a new farm after an older farm request fails', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const onFailure = jest.fn()
  const { result, rerender } = renderHook(
    ({ scopeId, animals }) => useOptimisticAreaMoves({ scopeId, animals, persistArea, onFailure }),
    { initialProps: { scopeId: 'farm-a', animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  rerender({
    scopeId: 'farm-other',
    animals: [{ ...a, farmId: 'farm-other', currentAreaId: 'area-other' }],
  })
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-new')
  })
  await act(async () => {
    first.reject(new Error('old farm'))
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-new')
  expect(result.current.failures).toHaveLength(0)
  expect(onFailure).not.toHaveBeenCalled()
  await act(async () => {
    second.resolve()
    await flush()
  })
})

it('does not publish an error after unmounting', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const onFailure = jest.fn()
  const { result, unmount } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea, onFailure }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  unmount()
  await act(async () => {
    pending.reject(new Error('late failure'))
    await flush()
  })
  expect(onFailure).not.toHaveBeenCalled()
})

it('skips a stale bulk-removal snapshot after the animal was moved elsewhere', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-c')
  })
  await act(async () => {
    await result.current.moveAnimal(a.id, '__unassigned__', true, 'area-a')
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
  expect(persistArea).toHaveBeenCalledTimes(1)
  await act(async () => {
    pending.resolve()
    await flush()
  })
})

it('rechecks a queued strict move so a later intention wins before persistence starts', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
  )
  let strict!: Promise<void>
  act(() => {
    strict = result.current.moveAnimal(a.id, '__unassigned__', true, 'area-a')
    void result.current.moveAnimal(a.id, 'area-c')
  })
  await act(async () => {
    await strict
    await flush()
  })
  expect(persistArea.mock.calls).toEqual([[a.id, 'area-c', { force: true }]])
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
  await act(async () => {
    pending.resolve()
    await flush()
  })
})

it('releases an acknowledged overlay when a remote third area arrived before the acknowledgement', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
  await act(async () => {
    pending.resolve()
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
})

it('releases an acknowledged overlay when a remote third area arrives later', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  await act(async () => {
    pending.resolve()
    await flush()
  })
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
})

it('does not treat a delayed snapshot of an earlier local move as a remote override', async () => {
  const first = deferred()
  const second = deferred()
  const persistArea = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
    await result.current.moveAnimal(a.id, 'area-c')
  })
  await act(async () => {
    first.resolve()
    await flush()
  })
  await act(async () => {
    second.resolve()
    await flush()
  })
  rerender({ animals: [{ ...a, currentAreaId: 'area-b' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  rerender({ animals: [{ ...a, currentAreaId: 'area-d' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-d')
})

it('respects a remote change instead of retaining an obsolete rollback overlay', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  await act(async () => {
    pending.reject(new Error('failed local write'))
    await flush()
  })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
})

it('clears orphaned confirmed overlays before a removed animal reappears', async () => {
  const pending = deferred()
  const persistArea = jest.fn(() => pending.promise)
  const { result, rerender } = renderHook(
    ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
    { initialProps: { animals: [a] } },
  )
  await act(async () => {
    await result.current.moveAnimal(a.id, 'area-b')
  })
  rerender({ animals: [] })
  await act(async () => {
    pending.resolve()
    await flush()
  })
  rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
  expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
})

it('does not enqueue a write for an animal from a different explicit farm', async () => {
  const persistArea = jest.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() =>
    useOptimisticAreaMoves({ scopeId: 'farm-other', animals: [a], persistArea }),
  )
  await act(async () => {
    await expect(result.current.moveAnimal(a.id, 'area-b')).rejects.toThrow('ya no está disponible')
  })
  expect(persistArea).not.toHaveBeenCalled()
})

it('bounds an acknowledged overlay when live data still reports an ambiguous original area', async () => {
  jest.useFakeTimers()
  try {
    const pending = deferred()
    const persistArea = jest.fn(() => pending.promise)
    const { result, unmount } = renderHook(() =>
      useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
    )
    await act(async () => {
      await result.current.moveAnimal(a.id, 'area-b')
      pending.resolve()
      await flush()
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
    act(() => {
      jest.advanceTimersByTime(1999)
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-a')
    unmount()
  } finally {
    jest.useRealTimers()
  }
})

it('never expires a newer pending intention using an older acknowledged overlay deadline', async () => {
  jest.useFakeTimers()
  const setTimer = jest.spyOn(global, 'setTimeout')
  const clearTimer = jest.spyOn(global, 'clearTimeout')
  try {
    const first = deferred()
    const second = deferred()
    const persistArea = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result, unmount } = renderHook(() =>
      useOptimisticAreaMoves({ scopeId: 'farm-a', animals: [a], persistArea }),
    )
    await act(async () => {
      await result.current.moveAnimal(a.id, 'area-b')
      first.resolve()
      await flush()
    })
    await act(async () => {
      await result.current.moveAnimal(a.id, 'area-c')
    })
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
    await act(async () => {
      second.resolve()
      await flush()
    })
    let releaseId: unknown
    setTimer.mock.calls.forEach(([, delay], index) => {
      if (delay === 2000) releaseId = setTimer.mock.results[index].value
    })
    expect(releaseId).toBeDefined()
    unmount()
    expect(clearTimer).toHaveBeenCalledWith(releaseId)
  } finally {
    setTimer.mockRestore()
    clearTimer.mockRestore()
    jest.useRealTimers()
  }
})

it('eventually trusts a remote return to an earlier local destination rather than keeping an orphan overlay', async () => {
  jest.useFakeTimers()
  try {
    const first = deferred()
    const second = deferred()
    const persistArea = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result, rerender, unmount } = renderHook(
      ({ animals }) => useOptimisticAreaMoves({ scopeId: 'farm-a', animals, persistArea }),
      { initialProps: { animals: [a] } },
    )
    await act(async () => {
      await result.current.moveAnimal(a.id, 'area-c')
      await result.current.moveAnimal(a.id, 'area-b')
      first.resolve()
      await flush()
    })
    rerender({ animals: [{ ...a, currentAreaId: 'area-c' }] })
    await act(async () => {
      second.resolve()
      await flush()
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-b')
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-c')
    unmount()
  } finally {
    jest.useRealTimers()
  }
})

it('clears acknowledged-overlay deadlines when switching farms', async () => {
  jest.useFakeTimers()
  const setTimer = jest.spyOn(global, 'setTimeout')
  const clearTimer = jest.spyOn(global, 'clearTimeout')
  try {
    const pending = deferred()
    const persistArea = jest.fn(() => pending.promise)
    const { result, rerender, unmount } = renderHook(
      ({ scopeId, animals }) => useOptimisticAreaMoves({ scopeId, animals, persistArea }),
      { initialProps: { scopeId: 'farm-a', animals: [a] } },
    )
    await act(async () => {
      await result.current.moveAnimal(a.id, 'area-b')
      pending.resolve()
      await flush()
    })
    const releaseIndex = setTimer.mock.calls.findIndex(([, delay]) => delay === 2000)
    expect(releaseIndex).toBeGreaterThanOrEqual(0)
    const releaseId = setTimer.mock.results[releaseIndex].value
    rerender({
      scopeId: 'farm-other',
      animals: [{ ...a, farmId: 'farm-other', currentAreaId: 'area-other' }],
    })
    expect(clearTimer).toHaveBeenCalledWith(releaseId)
    expect(result.current.visibleAnimals[0].currentAreaId).toBe('area-other')
    unmount()
  } finally {
    setTimer.mockRestore()
    clearTimer.mockRestore()
    jest.useRealTimers()
  }
})
