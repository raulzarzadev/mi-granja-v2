import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BreedingRecord } from '@/types/breedings'
import { serializeObj } from '../libs/serializeObj'

interface BreedingState {
  breedingRecords: BreedingRecord[]
  isLoading: boolean
  error: string | null
  selectedRecord: BreedingRecord | null
}

const initialState: BreedingState = {
  breedingRecords: [],
  isLoading: false,
  error: null,
  selectedRecord: null
}

const breedingSlice = createSlice({
  name: 'breeding',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setBreedingRecords: (state, action: PayloadAction<BreedingRecord[]>) => {
      state.breedingRecords = serializeObj(action.payload)
      state.error = null
    },
    addBreedingRecord: (state, action: PayloadAction<BreedingRecord>) => {
      state.breedingRecords.push(serializeObj(action.payload))
    },
    updateBreedingRecord: (state, action: PayloadAction<BreedingRecord>) => {
      const index = state.breedingRecords.findIndex(
        (record) => record.id === action.payload.id
      )
      if (index !== -1) {
        state.breedingRecords[index] = serializeObj(action.payload)
      }
    },
    removeBreedingRecord: (state, action: PayloadAction<string>) => {
      state.breedingRecords = state.breedingRecords.filter(
        (record) => record.id !== action.payload
      )
    },
    setSelectedRecord: (
      state,
      action: PayloadAction<BreedingRecord | null>
    ) => {
      state.selectedRecord = action.payload
        ? serializeObj(action.payload)
        : null
    },
    confirmPregnancy: (
      state,
      action: PayloadAction<{ id: string; confirmed: boolean }>
    ) => {
      const index = state.breedingRecords.findIndex(
        (record) => record.id === action.payload.id
      )
      if (index !== -1) {
        state.breedingRecords[index].pregnancyConfirmed =
          action.payload.confirmed
      }
    },
    recordBirth: (
      state,
      action: PayloadAction<{
        id: string
        actualBirthDate: Date
        offspring?: string[]
      }>
    ) => {
      const index = state.breedingRecords.findIndex(
        (record) => record.id === action.payload.id
      )
      if (index !== -1) {
        const record = state.breedingRecords[index]
        record.actualBirthDate = serializeObj(action.payload.actualBirthDate)
        if (action.payload.offspring) {
          record.offspring = action.payload.offspring
        }
        record.pregnancyConfirmed = true
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setLoading,
  setBreedingRecords,
  addBreedingRecord,
  updateBreedingRecord,
  removeBreedingRecord,
  setSelectedRecord,
  confirmPregnancy,
  recordBirth,
  setError,
  clearError
} = breedingSlice.actions

export const breedingReducer = breedingSlice.reducer
