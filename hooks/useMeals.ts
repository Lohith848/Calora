import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealLog {
  id: string
  userId: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  mealType: MealType
  imageUrl?: string
  loggedAt: string // ISO string
}

const LOCAL_MEALS_KEY = '@calora_meals'

// Helper to get local meals
async function getLocalMeals(): Promise<MealLog[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_MEALS_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.error('Failed to load local meals', e)
    return []
  }
}

// Helper to save local meals
async function saveLocalMeals(meals: MealLog[]) {
  try {
    await AsyncStorage.setItem(LOCAL_MEALS_KEY, JSON.stringify(meals))
  } catch (e) {
    console.error('Failed to save local meals', e)
  }
}

export function useMeals(dateString: string) {
  return useQuery<MealLog[]>({
    queryKey: ['meals', dateString],
    queryFn: async () => {
      // 1. If Supabase is enabled, fetch from database
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Query for meals on the specified date
          // dateString is YYYY-MM-DD
          const startOfDay = `${dateString}T00:00:00.000Z`
          const endOfDay = `${dateString}T23:59:59.999Z`

          const { data, error } = await supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .gte('logged_at', startOfDay)
            .lte('logged_at', endOfDay)
            .order('logged_at', { ascending: true })

          if (error) {
            console.error('Error fetching meals from Supabase, falling back to local:', error)
          } else if (data) {
            return data.map((row: any) => ({
              id: row.id,
              userId: row.user_id,
              name: row.name,
              calories: row.calories,
              protein: row.protein,
              carbs: row.carbs,
              fat: row.fat,
              mealType: row.meal_type as MealType,
              imageUrl: row.image_url,
              loggedAt: row.logged_at,
            }))
          }
        }
      }

      // 2. Offline / Fallback: Read from local AsyncStorage
      const allMeals = await getLocalMeals()
      return allMeals.filter((meal) => {
        // Match only the date portion (YYYY-MM-DD)
        const mealDate = meal.loggedAt.split('T')[0]
        return mealDate === dateString
      })
    },
    placeholderData: [],
  })
}

export function useAddMeal(dateString: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newMeal: Omit<MealLog, 'id' | 'userId' | 'loggedAt'> & { loggedAt?: string }) => {
      const finalMeal: MealLog = {
        id: Math.random().toString(36).substring(2, 9),
        userId: 'local-user',
        loggedAt: newMeal.loggedAt || new Date().toISOString(),
        ...newMeal,
      }

      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          finalMeal.userId = session.user.id
          
          const { data, error } = await supabase
            .from('meal_logs')
            .insert({
              name: finalMeal.name,
              calories: finalMeal.calories,
              protein: finalMeal.protein,
              carbs: finalMeal.carbs,
              fat: finalMeal.fat,
              meal_type: finalMeal.mealType,
              image_url: finalMeal.imageUrl,
              logged_at: finalMeal.loggedAt,
              user_id: session.user.id,
            })
            .select()
            .single()

          if (error) {
            console.error('Error saving meal to Supabase, saving locally instead:', error)
          } else if (data) {
            return {
              id: data.id,
              userId: data.user_id,
              name: data.name,
              calories: data.calories,
              protein: data.protein,
              carbs: data.carbs,
              fat: data.fat,
              mealType: data.meal_type as MealType,
              imageUrl: data.image_url,
              loggedAt: data.logged_at,
            }
          }
        }
      }

      // Local save
      const allMeals = await getLocalMeals()
      allMeals.push(finalMeal)
      await saveLocalMeals(allMeals)
      return finalMeal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', dateString] })
      queryClient.invalidateQueries({ queryKey: ['meals-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['meals-all'] })
    },
  })
}

export function useDeleteMeal(dateString: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mealId: string) => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { error } = await supabase
            .from('meal_logs')
            .delete()
            .eq('id', mealId)
            .eq('user_id', session.user.id)

          if (error) {
            console.error('Error deleting meal from Supabase:', error)
          } else {
            return mealId
          }
        }
      }

      // Local delete fallback
      const allMeals = await getLocalMeals()
      const filtered = allMeals.filter((m) => m.id !== mealId)
      await saveLocalMeals(filtered)
      return mealId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', dateString] })
      queryClient.invalidateQueries({ queryKey: ['meals-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['meals-all'] })
    },
  })
}

export function useMeal(mealId: string) {
  return useQuery<MealLog | null>({
    queryKey: ['meal', mealId],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('id', mealId)
          .maybeSingle()

        if (error) {
          console.error('Error fetching meal by ID from Supabase:', error)
        } else if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            mealType: data.meal_type as MealType,
            imageUrl: data.image_url,
            loggedAt: data.logged_at,
          }
        }
      }

      // Offline / local fallback
      const allMeals = await getLocalMeals()
      return allMeals.find((m) => m.id === mealId) ?? null
    },
  })
}

export function useUpdateMeal(dateString: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updatedMeal: MealLog) => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { error } = await supabase
            .from('meal_logs')
            .update({
              name: updatedMeal.name,
              calories: updatedMeal.calories,
              protein: updatedMeal.protein,
              carbs: updatedMeal.carbs,
              fat: updatedMeal.fat,
              meal_type: updatedMeal.mealType,
              image_url: updatedMeal.imageUrl,
              logged_at: updatedMeal.loggedAt,
            })
            .eq('id', updatedMeal.id)
            .eq('user_id', session.user.id)

          if (error) {
            console.error('Error updating meal in Supabase:', error)
          } else {
            return updatedMeal
          }
        }
      }

      // Local save
      const allMeals = await getLocalMeals()
      const idx = allMeals.findIndex((m) => m.id === updatedMeal.id)
      if (idx !== -1) {
        allMeals[idx] = updatedMeal
        await saveLocalMeals(allMeals)
      }
      return updatedMeal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meals', dateString] })
      queryClient.invalidateQueries({ queryKey: ['meal', data.id] })
      queryClient.invalidateQueries({ queryKey: ['meals-weekly'] })
      queryClient.invalidateQueries({ queryKey: ['meals-all'] })
    },
  })
}

// Hook to fetch weekly meals summary
export function useWeeklyMeals() {
  return useQuery({
    queryKey: ['meals-weekly'],
    queryFn: async () => {
      const allMeals = isSupabaseEnabled
        ? await fetchAllSupabaseMeals()
        : await getLocalMeals()

      // Group calories and macros by last 7 days
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        
        const dayMeals = allMeals.filter((m) => m.loggedAt.split('T')[0] === dateStr)
        const calories = dayMeals.reduce((sum, m) => sum + m.calories, 0)
        const protein = dayMeals.reduce((sum, m) => sum + m.protein, 0)
        const carbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0)
        const fat = dayMeals.reduce((sum, m) => sum + m.fat, 0)
        
        days.push({
          dateStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          calories,
          protein,
          carbs,
          fat,
        })
      }
      return days
    },
  })
}

async function fetchAllSupabaseMeals(): Promise<MealLog[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return []

    // Fetch meals from last 30 days
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 30)
    
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', pastDate.toISOString())

    if (error) throw error
    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      mealType: row.meal_type as MealType,
      imageUrl: row.image_url,
      loggedAt: row.logged_at,
    }))
  } catch (e) {
    console.error('Error fetching all meals from Supabase', e)
    return []
  }
}
