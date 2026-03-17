import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Sale } from '@/types/sales'
import { serializeObj } from '../libs/serializeObj'

interface SalesState {
  sales: Sale[]
  isLoading: boolean
  error: string | null
}

const initialState: SalesState = {
  sales: [],
  isLoading: false,
  error: null,
}

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setSales: (state, action: PayloadAction<Sale[]>) => {
      state.sales = serializeObj(action.payload)
      state.error = null
    },
    addSale: (state, action: PayloadAction<Sale>) => {
      state.sales.push(serializeObj(action.payload))
    },
    updateSale: (state, action: PayloadAction<Sale>) => {
      const index = state.sales.findIndex((s) => s.id === action.payload.id)
      if (index !== -1) {
        state.sales[index] = serializeObj(action.payload)
      }
    },
    removeSale: (state, action: PayloadAction<string>) => {
      state.sales = state.sales.filter((s) => s.id !== action.payload)
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setLoading, setSales, addSale, updateSale, removeSale, setError, clearError } =
  salesSlice.actions

export const salesReducer = salesSlice.reducer
