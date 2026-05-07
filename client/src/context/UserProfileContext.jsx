/**
 * UserProfileContext.jsx — single source of truth for user profile data.
 * Solves the "credentials being asked again and again" issue.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'crediwise_user_profile_v1'

const CATEGORIES = [
  'dining', 'fuel', 'grocery', 'travel',
  'online', 'utilities', 'international', 'other',
]

const EMPTY_PROFILE = {
  user_id:        'web-user',
  income_annual:  '',
  cibil_score:    '',
  current_cards:  [],
  monthly_spend:  Object.fromEntries(CATEGORIES.map(c => [c, ''])),
  updated_at:     null,
}

function debugLog(...args) {
  if (typeof window !== 'undefined' &&
      window.localStorage?.getItem('crediwise_debug') === '1') {
    console.log('[UserProfile]', ...args)
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      monthly_spend: { ...EMPTY_PROFILE.monthly_spend, ...(parsed.monthly_spend || {}) },
    }
  } catch (e) {
    debugLog('failed to load from storage', e)
    return EMPTY_PROFILE
  }
}

const UserProfileContext = createContext(null)

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState(loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      debugLog('persisted', profile)
    } catch (e) {
      debugLog('failed to persist', e)
    }
  }, [profile])

  const value = useMemo(() => ({
    profile,
    updateProfile(patch) {
      setProfile(p => ({ ...p, ...patch, updated_at: Date.now() }))
    },
    updateSpend(category, amount) {
      setProfile(p => ({
        ...p,
        monthly_spend: { ...p.monthly_spend, [category]: amount },
        updated_at: Date.now(),
      }))
    },
    setMonthlySpend(spendDict) {
      setProfile(p => ({
        ...p,
        monthly_spend: { ...EMPTY_PROFILE.monthly_spend, ...spendDict },
        updated_at: Date.now(),
      }))
    },
    asPayload() {
      return {
        user_id:       profile.user_id || 'web-user',
        monthly_spend: Object.fromEntries(
          Object.entries(profile.monthly_spend).map(([k, v]) => [k, Number(v) || 0])
        ),
        income_annual: Number(profile.income_annual) || 0,
        cibil_score:   Number(profile.cibil_score)   || 700,
        current_cards: profile.current_cards || [],
      }
    },
    resetProfile() {
      setProfile(EMPTY_PROFILE)
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
    },
  }), [profile])

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext)
  if (!ctx) {
    throw new Error('useUserProfile must be used inside <UserProfileProvider>')
  }
  return ctx
}

export const PROFILE_CATEGORIES = CATEGORIES
