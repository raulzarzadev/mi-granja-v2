import { BreedingRecord } from '@/types/breedings'
import { Comment, NewCommentInput } from '@/types/comment'

export type BreedingActionHandlers = {
  onConfirmPregnancy?: (record: BreedingRecord, femaleId: string) => void
  onUnconfirmPregnancy?: (record: BreedingRecord, femaleId: string) => void
  onRemoveFromBreeding?: (record: BreedingRecord, animalId: string) => void
  onDeleteBirth?: (record: BreedingRecord, femaleId: string) => void
  onAddBirth?: (record: BreedingRecord, femaleId: string) => void
  onAddComment?: (
    record: BreedingRecord,
    comment: NewCommentInput
  ) => Promise<Comment | void> | Comment | void
}
