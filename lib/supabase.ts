import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  ''

export const isSupabaseEnabled = !!SUPABASE_URL && !!SUPABASE_KEY

if (!isSupabaseEnabled) {
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or key — running without backend. ' +
    'Set values in .env.local to enable auth and database.'
  )
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_KEY  || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseEnabled,
      persistSession: isSupabaseEnabled,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    realtime: isSupabaseEnabled ? undefined : { params: { eventsPerSecond: 0 } },
    global: {
      fetch: isSupabaseEnabled
        ? undefined
        : () => Promise.resolve(new Response('null', { status: 200 })),
    },
    db: {
      schema: 'public',
    },
  }
)

if (isSupabaseEnabled) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
