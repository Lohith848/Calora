import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export interface WeightLog {
  id: string
  userId: string
  weightKg: number
  measuredAt: string
}

const LOCAL_WEIGHT_KEY = '@calora_weight_logs'

async function getLocalWeights(): Promise<WeightLog[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_WEIGHT_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

async function saveLocalWeights(weights: WeightLog[]) {
  try {
    await AsyncStorage.setItem(LOCAL_WEIGHT_KEY, JSON.stringify(weights))
  } catch { /* non-critical */ }
}

export function useWeightLogs() {
  return useQuery<WeightLog[]>({
    queryKey: ['weight-logs'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('measured_at', { ascending: false })
            .limit(100)
          if (!error && data) {
            return data.map((r: any) => ({
              id: r.id,
              userId: r.user_id,
              weightKg: r.weight_kg,
              measuredAt: r.measured_at,
            }))
          }
        }
      }
      return getLocalWeights()
    },
    placeholderData: [],
  })
}

export function useLatestWeight() {
  return useQuery<WeightLog | null>({
    queryKey: ['weight-latest'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('weight_logs')
            .select('*')
            .eq('user_id', session.user.id)
            .order('measured_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              weightKg: data.weight_kg,
              measuredAt: data.measured_at,
            }
          }
        }
      }
      const all = await getLocalWeights()
      return all.length > 0 ? all[0] : null
    },
  })
}

export function useAddWeight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (weightKg: number) => {
      const log: WeightLog = {
        id: Math.random().toString(36).substring(2, 9),
        userId: 'local-user',
        weightKg,
        measuredAt: new Date().toISOString(),
      }

      if (isSupabaseEnabled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data, error } = await supabase
            .from('weight_logs')
            .insert({ user_id: session.user.id, weight_kg: weightKg })
            .select()
            .single()
          if (!error && data) {
            return {
              id: data.id,
              userId: data.user_id,
              weightKg: data.weight_kg,
              measuredAt: data.measured_at,
            }
          }
        }
      }

      const all = await getLocalWeights()
      all.unshift(log)
      await saveLocalWeights(all)
      return log
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] })
      queryClient.invalidateQueries({ queryKey: ['weight-latest'] })
    },
  })
}
