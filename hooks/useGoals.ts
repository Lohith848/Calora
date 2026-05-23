import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export interface DailyGoals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const LOCAL_GOALS_KEY = '@calora_goals'

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 130, // grams
  carbs: 220,   // grams
  fat: 70,      // grams
}

async function getLocalGoals(): Promise<DailyGoals> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_GOALS_KEY)
    return data ? JSON.parse(data) : DEFAULT_GOALS
  } catch (e) {
    console.error('Failed to load local goals', e)
    return DEFAULT_GOALS
  }
}

async function saveLocalGoals(goals: DailyGoals) {
  try {
    await AsyncStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals))
  } catch (e) {
    console.error('Failed to save local goals', e)
  }
}

export function useGoals() {
  return useQuery<DailyGoals>({
    queryKey: ['goals'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('daily_goals')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (error) {
            console.error('Error fetching goals from Supabase:', error)
          } else if (data) {
            return {
              calories: data.calories ?? DEFAULT_GOALS.calories,
              protein: data.protein ?? DEFAULT_GOALS.protein,
              carbs: data.carbs ?? DEFAULT_GOALS.carbs,
              fat: data.fat ?? DEFAULT_GOALS.fat,
            }
          } else {
            // No goal row exists yet for this user, insert default row
            const { error: insertError } = await supabase
              .from('daily_goals')
              .insert({
                user_id: session.user.id,
                calories: DEFAULT_GOALS.calories,
                protein: DEFAULT_GOALS.protein,
                carbs: DEFAULT_GOALS.carbs,
                fat: DEFAULT_GOALS.fat,
              })
            
            if (insertError) {
              console.error('Failed to insert default goals row:', insertError)
            }
            return DEFAULT_GOALS
          }
        }
      }

      // Local fallback
      return await getLocalGoals()
    },
    placeholderData: DEFAULT_GOALS,
  })
}

export function useUpdateGoals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updated: Partial<DailyGoals>) => {
      const current = await getLocalGoals()
      const merged = { ...current, ...updated }

      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { error } = await supabase
            .from('daily_goals')
            .upsert({
              user_id: session.user.id,
              calories: merged.calories,
              protein: merged.protein,
              carbs: merged.carbs,
              fat: merged.fat,
              updated_at: new Date().toISOString(),
            })

          if (error) {
            console.error('Failed to update goals in Supabase:', error)
          } else {
            // Also update local cache for dual availability
            await saveLocalGoals(merged)
            return merged
          }
        }
      }

      await saveLocalGoals(merged)
      return merged
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}
