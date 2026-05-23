import { useQuery } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { type MealLog } from './useMeals'

const LOCAL_MEALS_KEY = '@calora_meals'

export function useStreak() {
  return useQuery<number>({
    queryKey: ['streak'],
    queryFn: async () => {
      let allMeals: MealLog[] = []

      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('meal_logs')
              .select('logged_at')
              .eq('user_id', session.user.id)

            if (error) throw error
            allMeals = (data ?? []).map((row: any) => ({
              loggedAt: row.logged_at,
            })) as MealLog[]
          } catch (e) {
            console.error('Error fetching meals for streak calculation from Supabase:', e)
          }
        }
      }

      if (allMeals.length === 0) {
        // Fallback to local
        try {
          const raw = await AsyncStorage.getItem(LOCAL_MEALS_KEY)
          allMeals = raw ? JSON.parse(raw) : []
        } catch (e) {
          console.error('Error loading local meals for streak calculation:', e)
        }
      }

      if (allMeals.length === 0) return 0

      // Extract unique dates as YYYY-MM-DD strings (using local time timezone)
      const loggedDates = Array.from(
        new Set(
          allMeals.map((meal) => {
            const d = new Date(meal.loggedAt)
            // Format to YYYY-MM-DD in local time
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          })
        )
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Descending (latest first)

      if (loggedDates.length === 0) return 0

      // Get local today and yesterday strings
      const getLocalDateString = (offset = 0) => {
        const d = new Date()
        d.setDate(d.getDate() - offset)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const todayStr = getLocalDateString(0)
      const yesterdayStr = getLocalDateString(1)

      const latestLogDate = loggedDates[0]

      // If the latest log is older than yesterday, the streak has been broken
      if (latestLogDate !== todayStr && latestLogDate !== yesterdayStr) {
        return 0
      }

      let streak = 0
      let checkDate = new Date(latestLogDate)

      // Traverse backwards and count consecutive logged days
      while (true) {
        const year = checkDate.getFullYear()
        const month = String(checkDate.getMonth() + 1).padStart(2, '0')
        const day = String(checkDate.getDate()).padStart(2, '0')
        const checkStr = `${year}-${month}-${day}`

        if (loggedDates.includes(checkStr)) {
          streak++
          // Move check date back by 1 day
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }

      return streak
    },
  })
}
