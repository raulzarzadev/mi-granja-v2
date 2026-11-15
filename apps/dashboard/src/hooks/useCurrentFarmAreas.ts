'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import type { FarmArea } from '@/types/farm'

const EMPTY_AREAS: FarmArea[] = []

/** Áreas de la granja actual (sin filtrar). */
export const useCurrentFarmAreas = (): FarmArea[] =>
  useSelector((state: RootState) => state.farm.currentFarm?.areas ?? EMPTY_AREAS)
