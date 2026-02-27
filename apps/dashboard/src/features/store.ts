import { configureStore } from '@reduxjs/toolkit'
import { animalsReducer } from './animals/animalsSlice'
import { authReducer } from './auth/authSlice'
import { breedingReducer } from './breeding/breedingSlice'
import { farmReducer } from './farm/farmSlice'
import { remindersReducer } from './reminders/remindersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    animals: animalsReducer,
    breeding: breedingReducer,
    reminders: remindersReducer,
    farm: farmReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Deshabilitar verificación de serializabilidad ya que usamos serializeObj
        ignoredActions: [],
        ignoredPaths: [],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
