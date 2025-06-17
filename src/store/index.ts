import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import animalsReducer from './animalsSlice'
import breedingReducer from './breedingSlice'
import weightReducer from './weightSlice'
import remindersReducer from './remindersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    animals: animalsReducer,
    breeding: breedingReducer,
    weight: weightReducer,
    reminders: remindersReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Deshabilitar verificación de serializabilidad ya que usamos serializeObj
        ignoredActions: [],
        ignoredPaths: []
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
