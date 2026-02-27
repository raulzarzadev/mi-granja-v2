export type Urgency = 'none' | 'low' | 'medium' | 'high'

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
