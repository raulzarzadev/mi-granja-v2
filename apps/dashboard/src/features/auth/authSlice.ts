import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from '@/types'
import { serializeObj } from '../libs/serializeObj'

interface AuthState {
  user?: User | null
  isLoading: boolean
  error: string | null
  emailLinkSent: boolean
  emailForLink: string | null
  originalUser?: User | null // Usuario admin original
  impersonatingUser?: User | null // Usuario siendo suplantado
  impersonationToken?: string | null // Token para la suplantación
}

const initialState: AuthState = {
  user: undefined,
  isLoading: false,
  error: null,
  emailLinkSent: false,
  emailForLink: null,
  originalUser: undefined,
  impersonatingUser: undefined,
  impersonationToken: undefined,
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
      state.originalUser = null
      state.impersonatingUser = null
      state.impersonationToken = null
    },
    setImpersonating: (
      state,
      action: PayloadAction<{
        originalUser: User
        impersonatedUser: User
        impersonationToken: string
      }>,
    ) => {
      const { originalUser, impersonatedUser, impersonationToken } = action.payload
      state.originalUser = serializeObj(originalUser)
      state.impersonatingUser = serializeObj(impersonatedUser)
      state.user = serializeObj(impersonatedUser)
      state.impersonationToken = impersonationToken
    },
    clearImpersonation: (state) => {
      if (state.originalUser) {
        state.user = state.originalUser
      }
      state.originalUser = null
      state.impersonatingUser = null
      state.impersonationToken = null
    },
  },
})

export const {
  setLoading,
  setUser,
  setError,
  clearError,
  setEmailLinkSent,
  clearEmailLinkState,
  logout,
  setImpersonating,
  clearImpersonation,
} = authSlice.actions

export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const authReducer = authSlice.reducer
