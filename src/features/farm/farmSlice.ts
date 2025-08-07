import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Farm } from '@/types/farm'

interface FarmState {
  farms: Farm[]
  currentFarm: Farm | null
  isLoading: boolean
  error: string | null
}

const initialState: FarmState = {
  farms: [],
  currentFarm: null,
  isLoading: false,
  error: null
}

const farmSlice = createSlice({
  name: 'farm',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null
      }
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },

    setFarms: (state, action: PayloadAction<Farm[]>) => {
      state.farms = action.payload
      state.isLoading = false
      state.error = null

      // Si no hay granja actual o ya no existe, establecer la primera
      if (
        !state.currentFarm ||
        !action.payload.find((f) => f.id === state.currentFarm?.id)
      ) {
        state.currentFarm = action.payload.length > 0 ? action.payload[0] : null
      }
    },

    addFarm: (state, action: PayloadAction<Farm>) => {
      state.farms.push(action.payload)

      // Si es la primera granja, establecerla como actual
      if (state.farms.length === 1) {
        state.currentFarm = action.payload
      }
    },

    updateFarm: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Farm> }>
    ) => {
      const { id, updates } = action.payload
      const farmIndex = state.farms.findIndex((farm) => farm.id === id)

      if (farmIndex !== -1) {
        state.farms[farmIndex] = { ...state.farms[farmIndex], ...updates }

        // Si es la granja actual, actualizar también
        if (state.currentFarm?.id === id) {
          state.currentFarm = { ...state.currentFarm, ...updates }
        }
      }
    },

    removeFarm: (state, action: PayloadAction<string>) => {
      const farmId = action.payload
      state.farms = state.farms.filter((farm) => farm.id !== farmId)

      // Si era la granja actual, cambiar a otra
      if (state.currentFarm?.id === farmId) {
        state.currentFarm = state.farms.length > 0 ? state.farms[0] : null
      }
    },

    setCurrentFarm: (state, action: PayloadAction<string | null>) => {
      if (!action.payload) {
        state.currentFarm = null
      } else {
        const farm = state.farms.find((f) => f.id === action.payload)
        state.currentFarm = farm || null
      }
    },

    // Acciones para áreas dentro de la granja
    addAreaToFarm: (
      state,
      action: PayloadAction<{ farmId: string; area: Farm['areas'][0] }>
    ) => {
      const { farmId, area } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm) {
        farm.areas.push(area)
        farm.updatedAt = new Date()

        // Si es la granja actual, actualizar también
        if (state.currentFarm?.id === farmId) {
          state.currentFarm = { ...farm }
        }
      }
    },

    updateAreaInFarm: (
      state,
      action: PayloadAction<{
        farmId: string
        areaId: string
        updates: Partial<Farm['areas'][0]>
      }>
    ) => {
      const { farmId, areaId, updates } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm) {
        const areaIndex = farm.areas.findIndex((a) => a.id === areaId)
        if (areaIndex !== -1) {
          farm.areas[areaIndex] = { ...farm.areas[areaIndex], ...updates }
          farm.updatedAt = new Date()

          // Si es la granja actual, actualizar también
          if (state.currentFarm?.id === farmId) {
            state.currentFarm = { ...farm }
          }
        }
      }
    },

    removeAreaFromFarm: (
      state,
      action: PayloadAction<{ farmId: string; areaId: string }>
    ) => {
      const { farmId, areaId } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm) {
        farm.areas = farm.areas.filter((a) => a.id !== areaId)
        farm.updatedAt = new Date()

        // Si es la granja actual, actualizar también
        if (state.currentFarm?.id === farmId) {
          state.currentFarm = { ...farm }
        }
      }
    },

    // Acciones para colaboradores dentro de la granja
    addCollaboratorToFarm: (
      state,
      action: PayloadAction<{
        farmId: string
        collaborator: NonNullable<Farm['collaborators']>[0]
      }>
    ) => {
      const { farmId, collaborator } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm) {
        if (!farm.collaborators) {
          farm.collaborators = []
        }
        farm.collaborators.push(collaborator)
        farm.updatedAt = new Date()

        // Si es la granja actual, actualizar también
        if (state.currentFarm?.id === farmId) {
          state.currentFarm = { ...farm }
        }
      }
    },

    updateCollaboratorInFarm: (
      state,
      action: PayloadAction<{
        farmId: string
        collaboratorId: string
        updates: Partial<NonNullable<Farm['collaborators']>[0]>
      }>
    ) => {
      const { farmId, collaboratorId, updates } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm?.collaborators) {
        const collaboratorIndex = farm.collaborators.findIndex(
          (c) => c.id === collaboratorId
        )
        if (collaboratorIndex !== -1) {
          farm.collaborators[collaboratorIndex] = {
            ...farm.collaborators[collaboratorIndex],
            ...updates
          }
          farm.updatedAt = new Date()

          // Si es la granja actual, actualizar también
          if (state.currentFarm?.id === farmId) {
            state.currentFarm = { ...farm }
          }
        }
      }
    },

    removeCollaboratorFromFarm: (
      state,
      action: PayloadAction<{
        farmId: string
        collaboratorId: string
      }>
    ) => {
      const { farmId, collaboratorId } = action.payload
      const farm = state.farms.find((f) => f.id === farmId)

      if (farm?.collaborators) {
        farm.collaborators = farm.collaborators.filter(
          (c) => c.id !== collaboratorId
        )
        farm.updatedAt = new Date()

        // Si es la granja actual, actualizar también
        if (state.currentFarm?.id === farmId) {
          state.currentFarm = { ...farm }
        }
      }
    },

    clearFarms: () => initialState
  }
})

export const {
  setLoading,
  setError,
  setFarms,
  addFarm,
  updateFarm,
  removeFarm,
  setCurrentFarm,
  addAreaToFarm,
  updateAreaInFarm,
  removeAreaFromFarm,
  addCollaboratorToFarm,
  updateCollaboratorInFarm,
  removeCollaboratorFromFarm,
  clearFarms
} = farmSlice.actions

export const farmReducer = farmSlice.reducer
