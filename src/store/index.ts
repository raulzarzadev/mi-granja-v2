import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import animalsReducer from './animalsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    animals: animalsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser'],
        ignoredPaths: ['auth.user.createdAt']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
