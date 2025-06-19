import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Reminder } from '@/types'
import { serializeObj } from '../libs/serializeObj'

interface RemindersState {
  reminders: Reminder[]
  isLoading: boolean
  error: string | null
  selectedReminder: Reminder | null
}

const initialState: RemindersState = {
  reminders: [],
  isLoading: false,
  error: null,
  selectedReminder: null
}

const remindersSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = serializeObj(action.payload)
      state.error = null
    },
    addReminder: (state, action: PayloadAction<Reminder>) => {
      state.reminders.push(serializeObj(action.payload))
    },
    updateReminder: (state, action: PayloadAction<Reminder>) => {
      const index = state.reminders.findIndex(
        (reminder) => reminder.id === action.payload.id
      )
      if (index !== -1) {
        state.reminders[index] = serializeObj(action.payload)
      }
    },
    removeReminder: (state, action: PayloadAction<string>) => {
      state.reminders = state.reminders.filter(
        (reminder) => reminder.id !== action.payload
      )
    },
    markReminderCompleted: (
      state,
      action: PayloadAction<{ id: string; completed: boolean }>
    ) => {
      const index = state.reminders.findIndex(
        (reminder) => reminder.id === action.payload.id
      )
      if (index !== -1) {
        state.reminders[index].completed = action.payload.completed
        // También serializar la fecha de actualización si se agrega
        state.reminders[index].updatedAt = serializeObj(new Date())
      }
    },
    setSelectedReminder: (state, action: PayloadAction<Reminder | null>) => {
      state.selectedReminder = action.payload
        ? serializeObj(action.payload)
        : null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setLoading,
  setReminders,
  addReminder,
  updateReminder,
  removeReminder,
  markReminderCompleted,
  setSelectedReminder,
  setError,
  clearError
} = remindersSlice.actions

export const remindersReducer = remindersSlice.reducer
