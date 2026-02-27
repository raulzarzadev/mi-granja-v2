import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Animal } from '@/types/animals'
import { serializeObj } from '../libs/serializeObj'

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
  selectedAnimal: null,
}

const animalsSlice = createSlice({
  name: 'animals',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setAnimals: (state, action: PayloadAction<Animal[]>) => {
      state.animals = serializeObj(action.payload).sort((a, b) =>
        a?.animalNumber?.localeCompare(b?.animalNumber),
      )
      state.error = null
    },
    addAnimal: (state, action: PayloadAction<Animal>) => {
      state.animals.push(serializeObj(action.payload))
      // Reordenar después de agregar
      state.animals.sort((a, b) => a?.animalNumber?.localeCompare(b?.animalNumber))
    },

    updateAnimal: (state, action: PayloadAction<{ id: string; data: Partial<Animal> }>) => {
      const index = state.animals.findIndex((animal) => animal.id === action.payload.id)
      if (index !== -1) {
        state.animals[index] = serializeObj({
          ...state.animals[index],
          ...action.payload.data,
          updatedAt: new Date(),
        })
        // Reordenar si se cambió el animalNumber
        if (action.payload.data.animalNumber) {
          state.animals.sort((a, b) => a?.animalNumber?.localeCompare(b?.animalNumber))
        }
      }
    },
    removeAnimal: (state, action: PayloadAction<string>) => {
      state.animals = state.animals.filter((animal) => animal.id !== action.payload)
    },
    setSelectedAnimal: (state, action: PayloadAction<Animal | null>) => {
      state.selectedAnimal = action.payload ? serializeObj(action.payload) : null
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

export const {
  setLoading,
  setAnimals,
  addAnimal,
  updateAnimal,
  removeAnimal,
  setSelectedAnimal,
  setError,
  clearError,
} = animalsSlice.actions

export const animalsReducer = animalsSlice.reducer
