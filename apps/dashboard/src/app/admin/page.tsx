'use client'

import React from 'react'
import { isUserAdmin } from '@/lib/userUtils'
import { redirect } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import AdminDashboardWithNavigation from '@/components/admin/AdminDashboardWithNavigation'

import { useAuth } from '@/hooks/useAuth'

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
