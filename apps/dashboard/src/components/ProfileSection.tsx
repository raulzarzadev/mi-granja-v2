'use client'

import { useSelector } from 'react-redux'
import type { RootState } from '@/features/store'
import BillingSection from './billing/BillingSection'
import NotificationsTab from './NotificationsTab'
import Tabs from './Tabs'

export default function ProfileSection() {
  const { user } = useSelector((state: RootState) => state.auth)
  if (!user) return null

  const tabs = [
    {
      label: '👤 Datos personales',
      content: (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Datos personales</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nombre</dt>
              <dd className="text-gray-900">{user.farmName || 'Sin nombre'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Correo electrónico</dt>
              <dd className="text-gray-900">{user.email}</dd>
            </div>
          </dl>
        </div>
      ),
    },
    { label: '💳 Mi Plan', content: <BillingSection /> },
    { label: '🔔 Notificaciones', content: <NotificationsTab /> },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-300 to-green-500 text-xl font-bold text-green-900 shadow-inner">
            {user.farmName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.farmName || user.email}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>
      <Tabs tabs={tabs} tabsId="profile-tabs" />
    </div>
  )
}
