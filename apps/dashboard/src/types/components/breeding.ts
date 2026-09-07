import { BreedingRecord } from '@/types/breedings'
import { Comment, NewCommentInput } from '@/types/comment'

export type AbortPregnancyInput = {
  date: Date
  note?: string
}

export type BreedingActionHandlers = {
  onConfirmPregnancy?: (record: BreedingRecord, femaleId: string) => void
  onUnconfirmPregnancy?: (record: BreedingRecord, femaleId: string) => void
  onAbort?: (
    record: BreedingRecord,
    femaleId: string,
    input: AbortPregnancyInput,
  ) => void | Promise<void>
  onRemoveFromBreeding?: (record: BreedingRecord, animalId: string) => void
  onDeleteBirth?: (record: BreedingRecord, femaleId: string) => void
  onAddBirth?: (record: BreedingRecord, femaleId: string) => void
  onAddComment?: (
    record: BreedingRecord,
    comment: NewCommentInput,
  ) => Promise<Comment | undefined> | Comment | undefined
}
