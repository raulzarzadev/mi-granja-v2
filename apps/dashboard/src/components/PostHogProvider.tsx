'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { useSelector } from 'react-redux'
import { getPosthog, identifyUser, resetIdentity } from '@/lib/analytics/posthog'
import { trackPageViewed } from '@/lib/analytics/track'
import { RootState } from '@/features/store'
import posthog from 'posthog-js'

/**
 * Mounts inside <Providers>. Initializes PostHog, identifies the Firebase
 * user when available, resets on logout, and emits a page_viewed event
 * on every App Router navigation. Person properties that change post-login
 * (plan, farm_count, species_managed) are pushed via setPersonProperties
 * so identify only fires once per user.
 */
export function PostHogProvider() {
  const user = useSelector((s: RootState) => s.auth.user)
  const farmCount = useSelector((s: RootState) => s.farm.farms?.length ?? 0)
  const planType = useSelector((s: RootState) => s.billing.planType)
  const animalTypes = useSelector((s: RootState) => s.animals.animals?.map((a) => a.type) ?? [])
  const pathname = usePathname()
  const lastIdentifiedId = useRef<string | null>(null)

  // Stable signature for species set so we don't re-run on every animals slice change.
  const speciesKey = useMemo(
    () => Array.from(new Set(animalTypes.filter(Boolean))).sort().join('|'),
    [animalTypes],
  )

  useEffect(() => {
    getPosthog()
  }, [])

  // One-shot identify per user.id change.
  useEffect(() => {
    if (user?.id) {
      if (lastIdentifiedId.current === user.id) return
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
        plan: planType,
        created_at: user.createdAt,
        farm_count: farmCount,
        species_managed: speciesKey ? speciesKey.split('|') : [],
      })
      lastIdentifiedId.current = user.id
    } else if (lastIdentifiedId.current) {
      resetIdentity()
      lastIdentifiedId.current = null
    }
  }, [user?.id])

  // Live updates to person properties (plan changes, new species, new farm).
  useEffect(() => {
    if (!user?.id || lastIdentifiedId.current !== user.id) return
    if (typeof window === 'undefined') return
    posthog.setPersonProperties({
      plan: planType,
      farm_count: farmCount,
      species_managed: speciesKey ? speciesKey.split('|') : [],
    })
  }, [user?.id, planType, farmCount, speciesKey])

  useEffect(() => {
    if (!pathname) return
    trackPageViewed(pathname)
  }, [pathname])

  return null
}
