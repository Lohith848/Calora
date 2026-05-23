import { useQuery } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { demoUser } from '@/lib/mockData'
import { getInitials } from '@/lib/utils'

export interface UserProfile {
    fullName: string
    email: string
    initials: string
    planType: 'free' | 'premium'
}

export function useProfile() {
    return useQuery<UserProfile>({
        queryKey: ['profile'],
        queryFn: async () => {
            let fullName = 'Health Enthusiast'
            let email = 'offline@calora.app'
            let planType: 'free' | 'premium' = 'free'

            if (isSupabaseEnabled) {
                try {
                    const { data: { user }, error: authErr } = await supabase.auth.getUser()
                    if (user) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('display_name, plan_type')
                            .eq('id', user.id)
                            .maybeSingle()

                        fullName =
                            profile?.display_name ||
                            (user.user_metadata?.full_name as string | undefined) ||
                            user.email?.split('@')[0] ||
                            'User'
                        email = user.email ?? ''
                        planType = (profile?.plan_type as 'free' | 'premium') ?? 'free'
                    }
                } catch (e) {
                    console.warn('[Profile] Failed to fetch profile from Supabase, using local fallback:', e)
                }
            }

            // If we are offline or Supabase returned defaults, try to load offline-saved name
            if (fullName === 'Health Enthusiast' || fullName === 'User') {
                const localName = await AsyncStorage.getItem('@calora_profile_name')
                if (localName) {
                    fullName = localName
                }
            }

            return {
                fullName,
                email,
                initials: getInitials(fullName),
                planType,
            }
        },
        placeholderData: {
            fullName: demoUser.fullName,
            email: demoUser.email,
            initials: demoUser.initials,
            planType: 'free',
        },
    })
}

