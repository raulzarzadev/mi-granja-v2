'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import BillingSection from './billing/BillingSection'
import NotificationsTab from './NotificationsTab'
import PersonalDetails from './PersonalDetails'
import Tabs from './Tabs'

export default function ProfileSection() {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return null

  const tabs = [
    {
      label: '👤 Datos personales',
      content: <PersonalDetails />,
    },
    { label: '💳 Mi Plan', content: <BillingSection /> },
    { label: '🔔 Notificaciones', content: <NotificationsTab /> },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-300 to-green-500 text-xl font-bold text-green-900 shadow-inner">
            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold text-gray-900">
              {user.name || user.email}
            </h2>
            <p className="break-all text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>
      <Tabs tabs={tabs} tabsId="profile-tabs" />
    </div>
  )
}
