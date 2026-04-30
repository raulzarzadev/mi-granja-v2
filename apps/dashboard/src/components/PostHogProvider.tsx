'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { getPosthog, identifyUser, resetIdentity } from '@/lib/analytics/posthog'
import { trackPageViewed } from '@/lib/analytics/track'
import { RootState } from '@/features/store'

/**
 * Mounts inside <Providers>. Initializes PostHog, identifies the Firebase
 * user when available, resets on logout, and emits a page_viewed event
 * on every App Router navigation.
 */
export function PostHogProvider() {
  const user = useSelector((s: RootState) => s.auth.user)
  const farms = useSelector((s: RootState) => s.farm.farms)
  const planType = useSelector((s: RootState) => s.billing.planType)
  const animals = useSelector((s: RootState) => s.animals.animals)
  const pathname = usePathname()
  const lastIdentifiedId = useRef<string | null>(null)

  useEffect(() => {
    getPosthog()
  }, [])

  useEffect(() => {
    if (user?.id) {
      if (lastIdentifiedId.current === user.id) return
      const speciesManaged = Array.from(
        new Set((animals || []).map((a) => a.type).filter(Boolean)),
      )
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
        plan: planType,
        created_at: user.createdAt,
        farm_count: farms?.length ?? 0,
        species_managed: speciesManaged,
      })
      lastIdentifiedId.current = user.id
    } else if (lastIdentifiedId.current) {
      resetIdentity()
      lastIdentifiedId.current = null
    }
  }, [user?.id, user?.email, user?.name, planType, farms?.length, animals])

  useEffect(() => {
    if (!pathname) return
    trackPageViewed(pathname)
  }, [pathname])

  return null
}
