import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  BillingSubscription,
  BillingUsage,
  PlanType,
  SubscriptionStatus,
} from '@/types/billing'

interface BillingState {
  subscription: BillingSubscription | null
  usage: BillingUsage | null
  planType: PlanType
  status: SubscriptionStatus
  isLoading: boolean
  error: string | null
}

const initialState: BillingState = {
  subscription: null,
  usage: null,
  planType: 'free',
  status: 'none',
  isLoading: false,
  error: null,
}

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null
      }
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },

    setSubscription: (state, action: PayloadAction<BillingSubscription | null>) => {
      state.subscription = action.payload
      state.planType = action.payload?.planType ?? 'free'
      state.status = action.payload?.status ?? 'none'
      state.isLoading = false
    },

    setUsage: (state, action: PayloadAction<BillingUsage>) => {
      state.usage = action.payload
    },

    clearBilling: () => initialState,
  },
})

export const { setLoading, setError, setSubscription, setUsage, clearBilling } =
  billingSlice.actions

export const billingReducer = billingSlice.reducer
