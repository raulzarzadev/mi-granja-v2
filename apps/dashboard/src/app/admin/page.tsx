'use client'

import { redirect } from 'next/navigation'
import React from 'react'
import AdminDashboardWithNavigation from '@/components/admin/AdminDashboardWithNavigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { isUserAdmin } from '@/lib/userUtils'

export default function AdminPage() {
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    redirect('/auth/complete')
  }

  if (!isUserAdmin(user)) {
    redirect('/')
  }

  return <AdminDashboardWithNavigation />
}
