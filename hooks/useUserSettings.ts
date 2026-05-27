import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export interface UserSettings {
  pushEnabled: boolean
  weeklyDigest: boolean
  compactMode: boolean
  emailForReports: string | null
  timezone: string
}

const DEFAULT_SETTINGS: UserSettings = {
  pushEnabled: true,
  weeklyDigest: true,
  compactMode: false,
  emailForReports: null,
  timezone: 'UTC',
}

const LOCAL_KEY = '@calora_settings'

async function getLocal(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

async function saveLocal(settings: UserSettings) {
  try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(settings)) } catch { /* noop */ }
}

export function useUserSettings() {
  return useQuery<UserSettings>({
    queryKey: ['user-settings'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (!error && data) {
            return {
              pushEnabled: data.push_enabled ?? true,
              weeklyDigest: data.weekly_digest ?? true,
              compactMode: data.compact_mode ?? false,
              emailForReports: data.email_for_reports ?? null,
              timezone: data.timezone ?? 'UTC',
            }
          }

          if (!error && !data) {
            await supabase
              .from('user_settings')
              .insert({ user_id: session.user.id })
          }
        }
      }
      return getLocal()
    },
    placeholderData: DEFAULT_SETTINGS,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const current = await getLocal()
      const merged = { ...current, ...updates }
      await saveLocal(merged)

      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('user_settings').upsert({
            user_id: session.user.id,
            push_enabled: merged.pushEnabled,
            weekly_digest: merged.weeklyDigest,
            compact_mode: merged.compactMode,
            email_for_reports: merged.emailForReports,
            timezone: merged.timezone,
            updated_at: new Date().toISOString(),
          })
        }
      }
      return merged
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
    },
  })
}
