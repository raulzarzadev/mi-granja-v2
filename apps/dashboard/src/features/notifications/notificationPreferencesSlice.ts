import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NotificationPreferences } from '@/types'
import { serializeObj } from '../libs/serializeObj'

interface NotificationPreferencesState {
  prefs: NotificationPreferences | null
  isLoading: boolean
  error: string | null
}

const initialState: NotificationPreferencesState = {
  prefs: null,
  isLoading: false,
  error: null,
}

const slice = createSlice({
  name: 'notificationPreferences',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) state.error = null
    },
    setPrefs: (state, action: PayloadAction<NotificationPreferences | null>) => {
      state.prefs = action.payload ? serializeObj(action.payload) : null
      state.isLoading = false
      state.error = null
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearPrefs: () => initialState,
  },
})

export const { setLoading, setPrefs, setError, clearPrefs } = slice.actions
export const notificationPreferencesReducer = slice.reducer
