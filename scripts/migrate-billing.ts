/**
 * Script de migración one-time: configura billing para usuarios existentes.
 *
 * - Usuarios con ≤1 granja → planType 'free', status 'none' (sin cambios reales)
 * - Usuarios con >1 granja o colaboradores → planType 'free', status 'none',
 *   se crea un flag `billingMigrationNeeded: true` para mostrar banner en dashboard
 *
 * Uso: npx tsx scripts/migrate-billing.ts
 *
 * Requiere GOOGLE_APPLICATION_CREDENTIALS apuntando a un service account
 * con acceso a Firestore.
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  // Inicializar Firebase Admin
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (serviceAccount) {
      initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
    } else {
      initializeApp()
    }
  }

  const db = getFirestore()
  const usersSnap = await db.collection('users').get()

  console.log(`Procesando ${usersSnap.size} usuarios...`)

  let free = 0
  let needsUpgrade = 0
  let errors = 0

  for (const userDoc of usersSnap.docs) {
    try {
      const userId = userDoc.id
      const userData = userDoc.data()

      // Saltar si ya tiene billing configurado
      if (userData.planType || userData.subscriptionStatus) {
        console.log(`  [skip] ${userId} — ya tiene billing configurado`)
        continue
      }

      // Contar granjas propias
      const farmsSnap = await db
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

      const needsBilling = farmCount > 1 || collaboratorCount > 0

      // Actualizar usuario
      const updateData: Record<string, unknown> = {
        planType: 'free',
        subscriptionStatus: 'none',
      }

      if (needsBilling) {
        updateData.billingMigrationNeeded = true
        needsUpgrade++
        console.log(
          `  [upgrade-needed] ${userId} — ${farmCount} granjas, ${collaboratorCount} colaboradores`,
        )
      } else {
        free++
        console.log(`  [free] ${userId} — ${farmCount} granja(s)`)
      }

      await db.doc(`users/${userId}`).update(updateData)
    } catch (err) {
      errors++
      console.error(`  [error] ${userDoc.id}:`, err)
    }
  }

  console.log('\n--- Resumen ---')
  console.log(`Total usuarios: ${usersSnap.size}`)
  console.log(`Plan gratuito (sin cambios): ${free}`)
  console.log(`Necesitan upgrade (banner): ${needsUpgrade}`)
  console.log(`Errores: ${errors}`)
}

main().catch(console.error)
