import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Animal } from '@/types'

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
      state.animals = action.payload
      state.error = null
    },
    addAnimal: (state, action: PayloadAction<Animal>) => {
      state.animals.push(action.payload)
    },
    updateAnimal: (state, action: PayloadAction<Animal>) => {
      const index = state.animals.findIndex(
        (animal) => animal.id === action.payload.id
      )
      if (index !== -1) {
        state.animals[index] = action.payload
      }
    },
    removeAnimal: (state, action: PayloadAction<string>) => {
      state.animals = state.animals.filter(
        (animal) => animal.id !== action.payload
      )
    },
    setSelectedAnimal: (state, action: PayloadAction<Animal | null>) => {
      state.selectedAnimal = action.payload
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

export default animalsSlice.reducer
