import { getMessaging } from 'firebase-admin/messaging'
import { getAdminFirestore } from './firebase-admin'

let messagingApp: ReturnType<typeof getMessaging> | null = null
function getAdminMessaging() {
  if (!messagingApp) {
    // firebase-admin getMessaging usa la default app inicializada por firebase-admin.ts
    // (necesitamos asegurar que getAdminApp() ya corrió)
    getAdminFirestore() // efecto: inicializa adminApp
    messagingApp = getMessaging()
  }
  return messagingApp
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Envía un push a todos los tokens dados. Limpia tokens inválidos automáticamente
 * eliminándolos del array de notificationPreferences/{userId}.
 */
export async function sendPushToUser(
  userId: string,
  tokens: string[],
  payload: PushPayload,
): Promise<{ success: number; failure: number }> {
  if (tokens.length === 0) return { success: 0, failure: 0 }

  // Cuando corre en emulador / sin credenciales, getMessaging() falla.
  // Skipear silenciosamente para no romper el cron en dev.
  if (
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ) {
    console.log(`[fcm] Emulador sin credenciales — skip push para ${userId}`)
    return { success: 0, failure: 0 }
  }

  const messaging = getAdminMessaging()
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.url ? { url: payload.url } : {},
    webpush: {
      fcmOptions: payload.url ? { link: payload.url } : undefined,
    },
  })

  // Limpiar tokens inválidos
  const invalidTokens: string[] = []
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[idx])
      }
    }
  })

  if (invalidTokens.length > 0) {
    const ref = getAdminFirestore().collection('notificationPreferences').doc(userId)
    const snap = await ref.get()
    const current = (snap.data()?.fcmTokens as string[] | undefined) ?? []
    const cleaned = current.filter((t) => !invalidTokens.includes(t))
    await ref.update({ fcmTokens: cleaned, updatedAt: new Date() })
  }

  return { success: response.successCount, failure: response.failureCount }
}
