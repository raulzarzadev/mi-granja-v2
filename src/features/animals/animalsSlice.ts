import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { serializeObj } from '../libs/serializeObj'
import { Animal } from '@/types/animals'

interface AnimalsState {
  animals: Animal[]
  isLoading: boolean
  error: string | null
  selectedAnimal: Animal | null
}

const initialState: AnimalsState = {
  animals: [],
  isLoading: false,
  error: null,
  selectedAnimal: null
}

const animalsSlice = createSlice({
  name: 'animals',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setAnimals: (state, action: PayloadAction<Animal[]>) => {
      state.animals = serializeObj(action.payload)
      state.error = null
    },
    addAnimal: (state, action: PayloadAction<Animal>) => {
      state.animals.push(serializeObj(action.payload))
    },

    updateAnimal: (
      state,
      action: PayloadAction<{ id: string; data: Partial<Animal> }>
    ) => {
      const index = state.animals.findIndex(
        (animal) => animal.id === action.payload.id
      )
      if (index !== -1) {
        state.animals[index] = serializeObj({
          ...state.animals[index],
          ...action.payload.data,
          updatedAt: new Date()
        })
      }
    },
    removeAnimal: (state, action: PayloadAction<string>) => {
      state.animals = state.animals.filter(
        (animal) => animal.id !== action.payload
      )
    },
    setSelectedAnimal: (state, action: PayloadAction<Animal | null>) => {
      state.selectedAnimal = action.payload
        ? serializeObj(action.payload)
        : null
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
  setAnimals,
  addAnimal,
  updateAnimal,
  removeAnimal,
  setSelectedAnimal,
  setError,
  clearError
} = animalsSlice.actions

export const animalsReducer = animalsSlice.reducer
