import { getAdminFirestore } from './firebase-admin'
import { getStripe } from './stripe'

/**
 * Sincroniza las cantidades de granjas y colaboradores en Stripe
 * cuando se crean/eliminan granjas o se aceptan/revocan colaboradores.
 *
 * Solo se ejecuta del lado del servidor (API routes).
 */
export async function syncStripeQuantities(userId: string): Promise<void> {
  const firestore = getAdminFirestore()
  const stripe = getStripe()

  // Obtener suscripción
  const subDoc = await firestore.doc(`subscriptions/${userId}`).get()
  if (!subDoc.exists) return

  const sub = subDoc.data()!
  if (sub.status !== 'active' && sub.status !== 'past_due') return

  // Contar granjas del usuario
  const farmsSnap = await firestore
    .collection('farms')
    .where('ownerId', '==', userId)
    .get()
  const farmCount = farmsSnap.size

  // Contar colaboradores activos
  let collaboratorCount = 0
  for (const farmDoc of farmsSnap.docs) {
    const farmData = farmDoc.data()
    const collabs = (farmData.collaborators ?? []) as { isActive?: boolean }[]
    collaboratorCount += collabs.filter((c) => c.isActive !== false).length
  }

  // Granjas adicionales = total - 1 (la primera es gratis)
  const extraFarms = Math.max(0, farmCount - 1)

  // Actualizar cantidades en Stripe
  const updates: { id: string; quantity: number }[] = []

  if (sub.stripeFarmItemId) {
    updates.push({ id: sub.stripeFarmItemId, quantity: extraFarms })
  }
  if (sub.stripeCollaboratorItemId) {
    updates.push({ id: sub.stripeCollaboratorItemId, quantity: collaboratorCount })
  }

  if (updates.length > 0) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: updates,
      proration_behavior: 'create_prorations',
    })
  }

  // Actualizar en Firestore
  await firestore.doc(`subscriptions/${userId}`).update({
    farmQuantity: extraFarms,
    collaboratorQuantity: collaboratorCount,
    updatedAt: new Date(),
  })
}
