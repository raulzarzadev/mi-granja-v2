'use client'

import React, { useState } from 'react'
import AdminHeader from './AdminHeader'
import AdminSidebar from './AdminSidebar'
import AdminOverview from './AdminOverview'
import AdminUsers from './AdminUsers'
import AdminAnimals from './AdminAnimals'
import AdminBreedings from './AdminBreedings'
import AdminReminders from './AdminReminders'
import AdminActivities from './AdminActivities'

type AdminSection =
  | 'overview'
  | 'users'
  | 'animals'
  | 'breedings'
  | 'reminders'
  | 'activities'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminOverview onSectionChange={setActiveSection} />
      case 'users':
        return <AdminUsers />
      case 'animals':
        return <AdminAnimals />
      case 'breedings':
        return <AdminBreedings />
      case 'reminders':
        return <AdminReminders />
      case 'activities':
        return <AdminActivities />
      default:
        return <AdminOverview onSectionChange={setActiveSection} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 p-6">{renderSection()}</main>
      </div>
    </div>
  )
}
