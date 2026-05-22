import { useState } from 'react'
import {
  View, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, DeviceEventEmitter,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Text } from '@/components/ui/Text'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { ACCENT, ACCENT_DIM, ACCENT_BORDER, BG, BORDER } from '@/lib/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { adjustBrightness } from '@/lib/utils'
import { Fonts } from '@/lib/typography'

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()

  const [displayName, setDisplayName] = useState('')
  const [calorieGoal,  setCalorieGoal]  = useState('2000')
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState<string | null>(null)

  track('onboarding_started')

  async function complete(name: string, targetCalories: string) {
    setLoading(true)
    setError(null)

    const caloriesVal = parseInt(targetCalories, 10)
    if (isNaN(caloriesVal) || caloriesVal < 800 || caloriesVal > 8000) {
      setLoading(false)
      setError('Please enter a realistic calorie goal between 800 and 8000 kcal.')
      return
    }

    const cleanName = name.trim() || 'Health Enthusiast'

    // Compute standard macro splits (25% Protein, 45% Carbs, 30% Fat)
    // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
    const protein = Math.round((caloriesVal * 0.25) / 4)
    const carbs = Math.round((caloriesVal * 0.45) / 4)
    const fat = Math.round((caloriesVal * 0.30) / 9)

    const baseGoals = {
      calories: caloriesVal,
      protein,
      carbs,
      fat,
    }

    try {
      await AsyncStorage.setItem('@nutriai_goals', JSON.stringify(baseGoals))
      await AsyncStorage.setItem('@nutriai_profile_name', cleanName)
    } catch (e) {
      console.error('Failed to save onboarding goals & profile:', e)
    }

    if (isSupabaseEnabled) {
      try {
        const { error: err } = await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,
            full_name: cleanName,
          },
        })

        if (err) {
          setLoading(false)
          setError(err.message || 'Could not save profile metadata.')
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Upsert profiles
          await supabase
            .from('profiles')
            .upsert({ id: user.id, display_name: cleanName })

          // Upsert daily_goals
          await supabase
            .from('daily_goals')
            .upsert({
              user_id: user.id,
              calories: baseGoals.calories,
              protein: baseGoals.protein,
              carbs: baseGoals.carbs,
              fat: baseGoals.fat,
            })
        }
      } catch (e) {
        console.warn('Backend database tables not accessible. Continuing offline-first.', e)
      }
    }

    track('onboarding_completed', { skipped: !name.trim(), calories: caloriesVal })
    setLoading(false)

    // Notify auth layout that setup is complete (and bypass in dev)
    DeviceEventEmitter.emit('__dev_complete_onboarding__')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.content}>
          {/* Header */}
          <View style={s.header}>
            <View style={[s.iconBadge, { backgroundColor: ACCENT_DIM, borderColor: ACCENT_BORDER }]}>
              <Text style={{ fontSize: 28 }}>🥗</Text>
            </View>
            <Text style={s.title}>Set up your profile</Text>
            <Text style={s.subtitle}>
              Customize your metrics to tailor your daily calorie and macro tracking.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={s.form}>
            <View style={s.fieldGroup}>
              <Text style={s.label}>YOUR NAME</Text>
              <TextInput
                value={displayName}
                onChangeText={(v) => { setDisplayName(v); setError(null) }}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255,255,255,0.18)"
                style={s.input}
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>DAILY CALORIE TARGET (KCAL)</Text>
              <TextInput
                value={calorieGoal}
                onChangeText={(v) => { setCalorieGoal(v.replace(/\D/g, '')); setError(null) }}
                placeholder="2000"
                placeholderTextColor="rgba(255,255,255,0.18)"
                style={s.input}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {error ? (
            <Animated.View entering={FadeIn.duration(180)} style={s.errorBox}>
              <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        {/* Bottom buttons */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.buttons}>
          <Pressable
            onPress={() => complete(displayName, calorieGoal)}
            disabled={loading}
            style={({ pressed }) => ({
              opacity: loading ? 0.5 : pressed ? 0.85 : 1,
              borderRadius: 16, overflow: 'hidden',
            })}
          >
            <LinearGradient
              colors={[ACCENT, adjustBrightness(ACCENT, -25)]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.primaryBtn}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                    Save & Continue  →
                  </Text>
              }
            </LinearGradient>
          </Pressable>

          <Pressable 
            onPress={() => complete('Health Tracker', '2000')} 
            disabled={loading} 
            style={{ alignItems: 'center', paddingVertical: 6 }}
          >
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Use defaults (2000 kcal)</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, gap: 24, justifyContent: 'center' },
  header: { gap: 12, alignItems: 'center', paddingBottom: 8 },
  iconBadge: {
    width: 80, height: 80, borderRadius: 24,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 21, maxWidth: 280 },

  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' },
  input: {
    height: 52, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 18, color: '#fff', fontSize: 16,
    fontFamily: Fonts.regular,
  },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  buttons:    { gap: 12 },
  primaryBtn: { height: 56, alignItems: 'center', justifyContent: 'center' },
})
