import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from '@/types'
import { serializeObj } from '../libs/serializeObj'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  emailLinkSent: boolean
  emailForLink: string | null
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  emailLinkSent: false,
  emailForLink: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload ? serializeObj(action.payload) : null
      state.error = null
      state.isLoading = false
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    },
    setEmailLinkSent: (state, action: PayloadAction<{ sent: boolean; email?: string }>) => {
      state.emailLinkSent = action.payload.sent
      state.emailForLink = action.payload.email || null
      if (action.payload.sent) {
        state.error = null
        state.isLoading = false
      }
    },
    clearEmailLinkState: (state) => {
      state.emailLinkSent = false
      state.emailForLink = null
    },
    logout: (state) => {
      state.user = null
      state.error = null
      state.isLoading = false
      state.emailLinkSent = false
      state.emailForLink = null
    }
  }
})

export const { setLoading, setUser, setError, clearError, setEmailLinkSent, clearEmailLinkState, logout } =
  authSlice.actions

export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const authReducer = authSlice.reducer
