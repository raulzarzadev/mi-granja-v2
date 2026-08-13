import { NextRequest, NextResponse } from 'next/server'
import { hardDeleteFarm } from '@/lib/admin/hard-delete-farm'
import { isAuthError, isAuthenticatedUserAdmin, verifyBillingAuth } from '@/lib/billing-auth'
import { getAdminFirestore } from '@/lib/firebase-admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> },
) {
  const authenticatedUser = await verifyBillingAuth(request)
  if (isAuthError(authenticatedUser)) return authenticatedUser

  const { farmId } = await params
  if (!farmId) {
    return NextResponse.json({ error: 'Granja requerida' }, { status: 400 })
  }

  try {
    const firestore = getAdminFirestore()
    const farmRef = firestore.collection('farms').doc(farmId)
    const farmSnapshot = await farmRef.get()

    // La operación es idempotente: reintentar una eliminación ya terminada no genera otro error.
    if (!farmSnapshot.exists) {
      return NextResponse.json({ success: true, alreadyDeleted: true })
    }

    const farm = farmSnapshot.data() ?? {}
    const requesterSnapshot = await firestore.collection('users').doc(authenticatedUser.uid).get()
    const requesterRoles = requesterSnapshot.data()?.roles
    const isAdmin = isAuthenticatedUserAdmin(authenticatedUser.email, requesterRoles)
    const isOwner = farm.ownerId === authenticatedUser.uid

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta granja' },
        { status: 403 },
      )
    }

    if (!farm.deletedAt) {
      return NextResponse.json(
        { error: 'La granja debe marcarse para eliminación antes de borrarla definitivamente' },
        { status: 409 },
      )
    }

    const result = await hardDeleteFarm(firestore, farmId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error eliminando granja permanentemente:', error)
    return NextResponse.json(
      { error: 'No se pudo eliminar la granja permanentemente' },
      { status: 500 },
    )
  }
}
