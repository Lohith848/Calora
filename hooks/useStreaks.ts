import { useQuery } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

const LOCAL_STREAK_KEY = '@calora_streak'

export function useStreak() {
  return useQuery<number>({
    queryKey: ['streak'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('user_streaks')
            .select('current_streak')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (!error && data?.current_streak != null) {
            await AsyncStorage.setItem(LOCAL_STREAK_KEY, String(data.current_streak))
            return data.current_streak
          }
        }
      }

      const cached = await AsyncStorage.getItem(LOCAL_STREAK_KEY)
      if (cached !== null) return parseInt(cached, 10)
      return 0
    },
  })
}

export function useLongestStreak() {
  return useQuery<number>({
    queryKey: ['streak-longest'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('user_streaks')
            .select('longest_streak')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (!error && data?.longest_streak != null) return data.longest_streak
        }
      }
      return 0
    },
  })
}
