'use client'

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUser } from '@/features/auth/authSlice'
import type { AppDispatch, RootState } from '@/features/store'
import { db } from '@/lib/firebase'

const LEGACY_DUPLICATE_WARNING_KEY = 'mg_empadre_duplicate_warning_dismissed'

function wasLegacyDuplicateWarningDismissed() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LEGACY_DUPLICATE_WARNING_KEY) === 'true'
  } catch {
    return false
  }
}

export function useUserPreferences() {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth.user)
  const userId = user?.id
  const profileDismissed = user?.preferences?.dismissedWarnings?.duplicateEmpadre
  const [duplicateEmpadreWarningDismissed, setLocalDuplicateEmpadreWarningDismissed] = useState(
    () => profileDismissed === true || wasLegacyDuplicateWarningDismissed(),
  )

  const saveDuplicateEmpadreWarningPreference = useCallback(
    async (dismissed: boolean) => {
      if (!userId) return
      await updateDoc(doc(db, 'users', userId), {
        'preferences.dismissedWarnings.duplicateEmpadre': dismissed,
        updatedAt: serverTimestamp(),
      })
    },
    [userId],
  )

  const updateProfileState = useCallback(
    (dismissed: boolean) => {
      if (!user) return
      dispatch(
        setUser({
          ...user,
          preferences: {
            ...user.preferences,
            dismissedWarnings: {
              ...user.preferences?.dismissedWarnings,
              duplicateEmpadre: dismissed,
            },
          },
        }),
      )
    },
    [dispatch, user],
  )

  useEffect(() => {
    if (!userId) {
      setLocalDuplicateEmpadreWarningDismissed(false)
      return
    }

    if (profileDismissed !== undefined) {
      setLocalDuplicateEmpadreWarningDismissed(profileDismissed === true)
      try {
        window.localStorage.removeItem(LEGACY_DUPLICATE_WARNING_KEY)
      } catch {}
      return
    }

    if (!wasLegacyDuplicateWarningDismissed()) {
      setLocalDuplicateEmpadreWarningDismissed(false)
      return
    }

    setLocalDuplicateEmpadreWarningDismissed(true)
    void saveDuplicateEmpadreWarningPreference(true)
      .then(() => {
        updateProfileState(true)
        try {
          window.localStorage.removeItem(LEGACY_DUPLICATE_WARNING_KEY)
        } catch {}
      })
      .catch((error) => {
        console.error('No se pudo migrar la preferencia del aviso de empadres:', error)
      })
  }, [profileDismissed, saveDuplicateEmpadreWarningPreference, updateProfileState, userId])

  const setDuplicateEmpadreWarningDismissed = useCallback(
    async (dismissed: boolean) => {
      if (!userId) return
      const previousValue = duplicateEmpadreWarningDismissed
      setLocalDuplicateEmpadreWarningDismissed(dismissed)
      updateProfileState(dismissed)
      try {
        await saveDuplicateEmpadreWarningPreference(dismissed)
      } catch (error) {
        setLocalDuplicateEmpadreWarningDismissed(previousValue)
        updateProfileState(previousValue)
        console.error('No se pudo guardar la preferencia del aviso de empadres:', error)
        throw error
      }
    },
    [
      duplicateEmpadreWarningDismissed,
      saveDuplicateEmpadreWarningPreference,
      updateProfileState,
      userId,
    ],
  )

  return {
    duplicateEmpadreWarningDismissed,
    setDuplicateEmpadreWarningDismissed,
  }
}
