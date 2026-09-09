import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AnimalRecordDocument } from '@/types/animals'
import { serializeObj } from '../libs/serializeObj'

interface AnimalRecordsState {
  records: AnimalRecordDocument[]
}

const initialState: AnimalRecordsState = {
  records: [],
}

const animalRecordsSlice = createSlice({
  name: 'animalRecords',
  initialState,
  reducers: {
    setAnimalRecords: (state, action: PayloadAction<AnimalRecordDocument[]>) => {
      state.records = serializeObj(action.payload).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
    addAnimalRecord: (state, action: PayloadAction<AnimalRecordDocument>) => {
      state.records = [
        serializeObj(action.payload),
        ...state.records.filter((record) => record.id !== action.payload.id),
      ]
    },
    clearAnimalRecords: (state) => {
      state.records = []
    },
  },
})

export const { setAnimalRecords, addAnimalRecord, clearAnimalRecords } = animalRecordsSlice.actions
export const animalRecordsReducer = animalRecordsSlice.reducer
