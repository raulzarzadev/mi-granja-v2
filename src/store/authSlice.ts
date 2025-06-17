import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
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
    logout: (state) => {
      state.user = null
      state.error = null
      state.isLoading = false
    }
  }
})

export const { setLoading, setUser, setError, clearError, logout } =
  authSlice.actions
export default authSlice.reducer
