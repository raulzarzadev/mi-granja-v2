import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  BillingInvoice,
  BillingSubscription,
  BillingUsage,
  PlanType,
  SubscriptionStatus,
} from '@/types/billing'

export type UpgradeReason = 'farm_limit' | 'collaborator_limit' | 'manual'

interface BillingState {
  subscription: BillingSubscription | null
  usage: BillingUsage | null
  invoices: BillingInvoice[]
  planType: PlanType
  status: SubscriptionStatus
  isLoading: boolean
  error: string | null
  showUpgradeModal: boolean
  upgradeReason: UpgradeReason | null
}

const initialState: BillingState = {
  subscription: null,
  usage: null,
  invoices: [],
  planType: 'free',
  status: 'none',
  isLoading: false,
  error: null,
  showUpgradeModal: false,
  upgradeReason: null,
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

    setInvoices: (state, action: PayloadAction<BillingInvoice[]>) => {
      state.invoices = action.payload
    },

    showUpgrade: (state, action: PayloadAction<UpgradeReason>) => {
      state.showUpgradeModal = true
      state.upgradeReason = action.payload
    },

    hideUpgrade: (state) => {
      state.showUpgradeModal = false
      state.upgradeReason = null
    },

    clearBilling: () => initialState,
  },
})

export const {
  setLoading,
  setError,
  setSubscription,
  setUsage,
  setInvoices,
  showUpgrade,
  hideUpgrade,
  clearBilling,
} = billingSlice.actions

export const billingReducer = billingSlice.reducer
