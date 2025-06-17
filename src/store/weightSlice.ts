import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { WeightRecord } from '@/types'
import { serializeObj } from './libs/serializeObj'

interface WeightState {
  weightRecords: WeightRecord[]
  isLoading: boolean
  error: string | null
}

const initialState: WeightState = {
  weightRecords: [],
  isLoading: false,
  error: null
}

const weightSlice = createSlice({
  name: 'weight',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setWeightRecords: (state, action: PayloadAction<WeightRecord[]>) => {
      state.weightRecords = serializeObj(action.payload)
      state.error = null
    },
    addWeightRecord: (state, action: PayloadAction<WeightRecord>) => {
      state.weightRecords.push(serializeObj(action.payload))
    },
    updateWeightRecord: (state, action: PayloadAction<WeightRecord>) => {
      const index = state.weightRecords.findIndex(
        (record) => record.id === action.payload.id
      )
      if (index !== -1) {
        state.weightRecords[index] = serializeObj(action.payload)
      }
    },
    removeWeightRecord: (state, action: PayloadAction<string>) => {
      state.weightRecords = state.weightRecords.filter(
        (record) => record.id !== action.payload
      )
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
  setWeightRecords,
  addWeightRecord,
  updateWeightRecord,
  removeWeightRecord,
  setError,
  clearError
} = weightSlice.actions

export default weightSlice.reducer
