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
import {
  SURFACE_ELEVATED, SURFACE_CONTAINER_LOW,
  ON_SURFACE, ON_SURFACE_VARIANT,
  OUTLINE, OUTLINE_VARIANT,
  PRIMARY, ACCENT, ACCENT_DIM, ACCENT_BORDER, SHADOW_SM,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_DISABLED,
  BG, BORDER,
} from '@/lib/theme'
import { Fonts } from '@/lib/typography'

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()

  const [displayName, setDisplayName] = useState('')
  const [calorieGoal, setCalorieGoal] = useState('2000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await AsyncStorage.setItem('@calora_goals', JSON.stringify(baseGoals))
      await AsyncStorage.setItem('@calora_profile_name', cleanName)
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
          await supabase
            .from('profiles')
            .upsert({ id: user.id, display_name: cleanName })

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
            <View style={s.iconBadge}>
              <Text style={{ fontSize: 28 }}>🥗</Text>
            </View>
            <Text style={s.title}>Set up your profile</Text>
            <Text style={s.subtitle}>
              Customize your metrics to tailor your daily calorie and macro tracking.
            </Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={s.label}>YOUR NAME</Text>
                <TextInput
                  value={displayName}
                  onChangeText={(v) => { setDisplayName(v); setError(null) }}
                  placeholder="Enter your name"
                  placeholderTextColor={TEXT_DISABLED}
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
                  placeholderTextColor={TEXT_DISABLED}
                  style={s.input}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            {error ? (
              <Animated.View entering={FadeIn.duration(180)} style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </Animated.View>
            ) : null}
          </View>
        </Animated.View>

        {/* Bottom buttons */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.buttons}>
          <Pressable
            onPress={() => complete(displayName, calorieGoal)}
            disabled={loading}
            style={({ pressed }) => ({
              opacity: loading ? 0.5 : pressed ? 0.92 : 1,
            })}
          >
            <View style={s.primaryBtn}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.primaryBtnText}>Save & Continue  →</Text>
              }
            </View>
          </Pressable>

          <Pressable
            onPress={() => complete('Health Tracker', '2000')}
            disabled={loading}
            style={s.skipLink}
          >
            <Text style={s.skipText}>Use defaults (2000 kcal)</Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: BG,
  },
  content: {
    flex: 1,
    gap: 24,
    justifyContent: 'center',
  },
  header: {
    gap: 12,
    alignItems: 'center',
    paddingBottom: 8,
  },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ON_SURFACE,
    letterSpacing: -0.5,
    textAlign: 'center',
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    fontFamily: Fonts.regular,
  },
  card: {
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    ...SHADOW_SM,
  },
  form: {
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TEXT_TERTIARY,
    fontFamily: Fonts.bold,
  },
  input: {
    height: 52,
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 18,
    color: ON_SURFACE,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  errorBox: {
    backgroundColor: 'rgba(186,26,26,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#ba1a1a',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  buttons: {
    gap: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: Fonts.bold,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontFamily: Fonts.regular,
  },
})
