import { Urgency } from '@/lib/animal-utils'

export type Comment = {
  content: string
  urgency?: Urgency
  id: string
  createdAt?: Date
  createdBy?: string
}

export type NewCommentInput = {
  content: string
  urgency?: Urgency
}
