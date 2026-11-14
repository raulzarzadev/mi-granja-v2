import { Timestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from '@/lib/firebase-admin'

// Colección privada: los clientes solo acceden mediante la API administrativa.
export function chatHistoryCollection(userId: string) {
  return getAdminFirestore().collection('aiChatHistory').doc(userId).collection('queries')
}

export async function startChatHistory(input: {
  userId: string
  reservationId: string
  farmId: string
  farmName: string
  conversationId: string
  question: string
}) {
  const { userId, reservationId, ...data } = input
  await chatHistoryCollection(userId)
    .doc(reservationId)
    .create({
      ...data,
      status: 'pending',
      createdAt: Timestamp.now(),
    })
}

export async function finishChatHistory(
  userId: string,
  reservationId: string,
  result: { answer: string; provider: string; model: string; tokens: number } | null,
) {
  await chatHistoryCollection(userId)
    .doc(reservationId)
    .update({
      ...(result ?? {}),
      status: result ? 'completed' : 'failed',
    })
}
