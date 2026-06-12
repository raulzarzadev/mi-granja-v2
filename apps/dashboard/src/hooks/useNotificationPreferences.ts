'use client'

import { arrayRemove, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearPrefs,
  setLoading,
  setPrefs,
} from '@/features/notifications/notificationPreferencesSlice'
import type { AppDispatch, RootState } from '@/features/store'
import { db } from '@/lib/firebase'
import type { NotificationPreferences } from '@/types'

/**
 * Sincroniza notificationPreferences/{uid} con Redux y expone setters.
 * Montar 1 vez en el layout autenticado.
 */
export function useNotificationPreferences() {
  const dispatch = useDispatch<AppDispatch>()
  const userId = useSelector((s: RootState) => s.auth.user?.id)
  const prefs = useSelector((s: RootState) => s.notificationPreferences.prefs)
  const isLoading = useSelector((s: RootState) => s.notificationPreferences.isLoading)

  useEffect(() => {
    if (!userId) {
      dispatch(clearPrefs())
      return
    }
    dispatch(setLoading(true))
    const ref = doc(db, 'notificationPreferences', userId)
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          dispatch(setPrefs(null))
          return
        }
        const data = snap.data() as Partial<NotificationPreferences>
        dispatch(
          setPrefs({
            userId,
            pushEnabled: Boolean(data.pushEnabled),
            emailEnabled: data.emailEnabled !== false,
            marketingEmailEnabled: data.marketingEmailEnabled !== false,
            fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : [],
            updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(),
          }),
        )
      },
      (err) => {
        console.error('useNotificationPreferences snapshot error:', err)
        dispatch(setPrefs(null))
      },
    )
  }, [userId, dispatch])

  const setPushEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return
      await setDoc(
        doc(db, 'notificationPreferences', userId),
        { userId, pushEnabled: enabled, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [userId],
  )

  const setEmailEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return
      await setDoc(
        doc(db, 'notificationPreferences', userId),
        { userId, emailEnabled: enabled, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [userId],
  )

  const setMarketingEmailEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return
      await setDoc(
        doc(db, 'notificationPreferences', userId),
        { userId, marketingEmailEnabled: enabled, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [userId],
  )

  const removeFcmToken = useCallback(
    async (token: string) => {
      if (!userId) return
      await setDoc(
        doc(db, 'notificationPreferences', userId),
        { fcmTokens: arrayRemove(token), updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [userId],
  )

  return {
    prefs,
    isLoading,
    setPushEnabled,
    setEmailEnabled,
    setMarketingEmailEnabled,
    removeFcmToken,
  }
}
