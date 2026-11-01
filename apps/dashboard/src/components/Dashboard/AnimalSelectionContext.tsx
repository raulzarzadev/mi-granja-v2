'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

const AnimalSelectionContext = createContext<{
  selectedAnimalIds: string[]
  setSelectedAnimalIds: (ids: string[]) => void
}>({ selectedAnimalIds: [], setSelectedAnimalIds: () => {} })

export function AnimalSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const value = useMemo(() => ({ selectedAnimalIds, setSelectedAnimalIds }), [selectedAnimalIds])
  return <AnimalSelectionContext.Provider value={value}>{children}</AnimalSelectionContext.Provider>
}

export const useAnimalSelection = () => useContext(AnimalSelectionContext)
