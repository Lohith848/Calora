import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface AppNotification {
  id: string
  title: string
  body: string
  timeAgo: string
  category: 'daily' | 'streak' | 'goal' | 'system'
  read: boolean
  createdAt: string
}

const LOCAL_KEY = '@calora_notifications'

function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? '',
    timeAgo: formatTimeAgo(row.created_at),
    category: row.category === 'billing' || row.category === 'team' || row.category === 'product'
      ? 'system' as const
      : (row.category ?? 'system'),
    read: row.read ?? false,
    createdAt: row.created_at,
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const created = new Date(dateStr).getTime()
  const diff = now - created
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)
          if (!error && data) {
            const mapped = data.map(rowToNotification)
            await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(mapped))
            return mapped
          }
        }
      }

      const cached = await AsyncStorage.getItem(LOCAL_KEY)
      if (cached) return JSON.parse(cached)

      const userId = 'local-user'
      const localNotifs: AppNotification[] = [
        {
          id: 'local-1',
          title: 'Welcome to Calora!',
          body: 'Start tracking your meals to see personalized insights.',
          timeAgo: '1d ago',
          category: 'system',
          read: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
      return localNotifs
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (isSupabaseEnabled) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (isSupabaseEnabled) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
