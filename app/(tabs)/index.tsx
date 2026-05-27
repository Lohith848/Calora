import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  SURFACE_ELEVATED,
  SURFACE_CONTAINER_LOW,
  SURFACE_DIM,
  ON_SURFACE,
  ON_SURFACE_VARIANT,
  OUTLINE,
  OUTLINE_VARIANT,
  PRIMARY,
  ENERGY_ORANGE,
  PROTEIN_GREEN,
  CARB_BLUE,
  FAT_YELLOW,
  STREAK_RED,
  WATER_CYAN,
  SHADOW_SM,
  SHADOW_MD,
  SHADOW_LG,
  ACCENT,
  ACCENT_DIM,
  ACCENT_BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  BG,
  BORDER,
  ERROR,
  TEXT_DISABLED,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useMeals, useDeleteMeal, type MealLog, type MealType } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'
import { useProfile } from '@/hooks/useProfile'
import { useLatestWeight, useAddWeight } from '@/hooks/useWeightTracking'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [weightModal, setWeightModal] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [updatingWeight, setUpdatingWeight] = useState(false)

  const { data: latestWeight } = useLatestWeight()
  const addWeightMutation = useAddWeight()

  const handleAddWeight = useCallback(async () => {
    const kg = parseFloat(weightInput)
    if (isNaN(kg) || kg <= 0 || kg >= 500) return
    setUpdatingWeight(true)
    try {
      await addWeightMutation.mutateAsync(kg)
      setWeightModal(false)
      setWeightInput('')
    } catch { /* ignore */ }
    finally { setUpdatingWeight(false) }
  }, [weightInput, addWeightMutation])

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const dateString = getLocalDateString(selectedDate)

  const { data: profile } = useProfile()
  const { data: meals = [], isLoading: loadingMeals, refetch: refetchMeals } = useMeals(dateString)
  const { data: goals, isLoading: loadingGoals } = useGoals()
  const { data: streak = 0 } = useStreak()
  const deleteMealMutation = useDeleteMeal(dateString)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const changeDate = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(selectedDate.getDate() + offset)
    setSelectedDate(next)
  }

  const dateLabel = useMemo(() => {
    const today = getLocalDateString(new Date())
    const yesterday = getLocalDateString(new Date(new Date().getTime() - 86400000))
    const tomorrow = getLocalDateString(new Date(new Date().getTime() + 86400000))

    if (dateString === today) return 'Today'
    if (dateString === yesterday) return 'Yesterday'
    if (dateString === tomorrow) return 'Tomorrow'

    return selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [dateString, selectedDate])

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories
        acc.protein += meal.protein
        acc.carbs += meal.carbs
        acc.fat += meal.fat
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [meals])

  const calorieGoal = goals?.calories ?? 2000
  const proteinGoal = goals?.protein ?? 130
  const carbsGoal = goals?.carbs ?? 220
  const fatGoal = goals?.fat ?? 70

  const remainingCalories = calorieGoal - totals.calories

  const categorizedMeals = useMemo(() => {
    const groups: Record<MealType, MealLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    meals.forEach((m) => {
      if (groups[m.mealType]) {
        groups[m.mealType].push(m)
      } else {
        groups.snack.push(m)
      }
    })
    return groups
  }, [meals])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meals', dateString] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['streak'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ])
    setRefreshing(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMealMutation.mutateAsync(id)
    } catch (e) {
      console.error('Failed to delete meal log:', e)
    }
  }

  const ringSize = 140
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressRatio = totals.calories / calorieGoal
  const strokeDashoffset = circumference - Math.min(1, progressRatio) * circumference

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 90 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>
              {greeting}, {(profile?.fullName ?? '').split(' ')[0] || 'User'}
            </Text>
            <Text style={s.subGreeting}>Let's hit your nutritional goals.</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={{ fontSize: 15 }}>🔥</Text>
            <Text style={s.streakCount}>{streak}</Text>
            <Text style={s.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Weight Card */}
        {latestWeight && (
          <Pressable onPress={() => setWeightModal(true)}>
            <Card style={s.weightSummaryCard}>
              <Ionicons name="scale-outline" size={16} color={TEXT_SECONDARY} />
              <Text style={s.weightSummaryText}>{latestWeight.weightKg} kg</Text>
              <View style={s.weightSummaryDot} />
              <Text style={s.weightSummaryLabel}>Today</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={14} color={TEXT_TERTIARY} />
            </Card>
          </Pressable>
        )}

        {/* Date Selector */}
        <View style={s.dateSlider}>
          <Pressable onPress={() => changeDate(-1)} style={s.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT_SECONDARY} />
          </Pressable>
          <Text style={s.dateText}>{dateLabel}</Text>
          <Pressable onPress={() => changeDate(1)} style={s.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {/* Calorie Summary Card */}
        <Card style={s.summaryCard}>
          <View style={s.summaryMain}>
            <View style={s.circleContainer}>
              <Svg width={ringSize} height={ringSize} style={s.svgRing}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={SURFACE_CONTAINER_LOW}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={ENERGY_ORANGE}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </Svg>
              <View style={s.centerTextWrapper}>
                <Text style={s.centerNumber}>
                  {remainingCalories >= 0 ? remainingCalories : Math.abs(remainingCalories)}
                </Text>
                <Text style={s.centerLabel}>
                  {remainingCalories >= 0 ? 'kcal left' : 'kcal over'}
                </Text>
              </View>
            </View>

            <View style={s.metricsTextSide}>
              <View style={s.metricSideRow}>
                <View style={[s.metricSideDot, { backgroundColor: ENERGY_ORANGE }]} />
                <View>
                  <Text style={s.metricSideLabel}>Goal</Text>
                  <Text style={s.metricSideVal}>{calorieGoal.toLocaleString()} kcal</Text>
                </View>
              </View>
              <View style={s.metricSideRow}>
                <View style={[s.metricSideDot, { backgroundColor: SURFACE_DIM }]} />
                <View>
                  <Text style={s.metricSideLabel}>Logged</Text>
                  <Text style={s.metricSideVal}>{totals.calories.toLocaleString()} kcal</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.macrosContainer}>
            <MacroProgress
              name="Protein"
              value={totals.protein}
              goal={proteinGoal}
              color={PROTEIN_GREEN}
              unit="g"
            />
            <MacroProgress
              name="Carbs"
              value={totals.carbs}
              goal={carbsGoal}
              color={CARB_BLUE}
              unit="g"
            />
            <MacroProgress
              name="Fat"
              value={totals.fat}
              goal={fatGoal}
              color={FAT_YELLOW}
              unit="g"
            />
          </View>
        </Card>

        {/* Food Diary */}
        <View style={s.diaryHeaderWrap}>
          <Text style={s.sectionTitle}>Food Diary</Text>
        </View>

        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
          const typeMeals = categorizedMeals[type]
          const typeCalories = typeMeals.reduce((sum, m) => sum + m.calories, 0)

          return (
            <View key={type} style={s.mealSection}>
              <View style={s.mealSectionHeader}>
                <View>
                  <Text style={s.mealTypeName}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                  <Text style={s.mealTypeCalories}>{typeCalories} kcal</Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/scan?mealType=${type}`)}
                  style={({ pressed }) => [s.addMealBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add" size={16} color={ACCENT} />
                  <Text style={s.addMealBtnText}>Log</Text>
                </Pressable>
              </View>

              <Card compact style={s.mealSectionCard}>
                {typeMeals.length === 0 ? (
                  <Pressable
                    onPress={() => router.push(`/scan?mealType=${type}`)}
                    style={s.emptyMealState}
                  >
                    <Text style={s.emptyMealText}>No food logged for {type}. Tap to scan.</Text>
                  </Pressable>
                ) : (
                  typeMeals.map((meal, index) => (
                    <View
                      key={meal.id}
                      style={[
                        s.mealRow,
                        index < typeMeals.length - 1 && s.mealRowDivider,
                      ]}
                    >
                      {meal.imageUrl ? (
                        <Image source={{ uri: meal.imageUrl }} style={s.mealImage} />
                      ) : (
                        <View style={s.mealImageFallback}>
                          <Ionicons name="restaurant-outline" size={16} color={TEXT_TERTIARY} />
                        </View>
                      )}
                      <View style={s.mealInfo}>
                        <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
                        <Text style={s.mealMacros}>
                          P: {meal.protein}g · C: {meal.carbs}g · F: {meal.fat}g
                        </Text>
                      </View>
                      <Text style={s.mealCaloriesText}>{meal.calories} kcal</Text>
                      <Pressable
                        onPress={() => handleDelete(meal.id)}
                        hitSlop={12}
                        style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="trash-outline" size={15} color={ERROR} />
                      </Pressable>
                    </View>
                  ))
                )}
              </Card>
            </View>
          )
        })}
      </ScrollView>

      {/* Weight Log Modal */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => !updatingWeight && setWeightModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.wmContainer}>
          <Pressable style={s.wmBackdrop} onPress={() => !updatingWeight && setWeightModal(false)} />
          <View style={s.wmSheet}>
            <View style={s.wmHandle} />
            <Text style={s.wmTitle}>Log Weight</Text>
            <Text style={s.wmSub}>Enter your current weight in kilograms.</Text>
            <View style={s.wmForm}>
              <Text style={s.wmLabel}>WEIGHT (KG)</Text>
              <TextInput
                value={weightInput}
                onChangeText={(v) => setWeightInput(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                style={s.wmInput}
                placeholder="e.g. 72.5"
                placeholderTextColor={TEXT_DISABLED}
                autoFocus
              />
            </View>
            <View style={s.wmActions}>
              <Pressable disabled={updatingWeight} onPress={() => setWeightModal(false)} style={s.wmCancel}>
                <Text style={s.wmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={updatingWeight || !weightInput} onPress={handleAddWeight} style={({ pressed }) => [s.wmSave, pressed && { opacity: 0.85 }]}>
                {updatingWeight ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.wmSaveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB */}
      <View style={[s.fabContainer, { bottom: insets.bottom + TAB_BAR_CLEARANCE + 16 }]}>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
        >
          <Ionicons name="camera" size={22} color="#fff" />
          <Text style={s.fabText}>Scan Meal</Text>
        </Pressable>
      </View>
    </View>
  )
}

function MacroProgress({
  name,
  value,
  goal,
  color,
  unit = 'g',
}: {
  name: string
  value: number
  goal: number
  color: string
  unit?: string
}) {
  const pct = Math.min(1, value / goal)
  return (
    <View style={s.macroCol}>
      <View style={s.macroLabelRow}>
        <Text style={s.macroName}>{name}</Text>
        <Text style={s.macroQty}>
          {value}
          <Text style={{ color: TEXT_TERTIARY }}>/{goal}{unit}</Text>
        </Text>
      </View>
      <View style={s.progressBarBg}>
        <View
          style={[
            s.progressBarFill,
            { backgroundColor: color, width: `${pct * 100}%` },
          ]}
        />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2, fontWeight: '400' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  streakCount: { fontSize: 13, fontWeight: '800', color: STREAK_RED },
  streakLabel: { fontSize: 12, fontWeight: '600', color: TEXT_SECONDARY },

  // Weight Summary
  weightSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  weightSummaryText: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  weightSummaryDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: TEXT_TERTIARY,
  },
  weightSummaryLabel: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' },

  // Date Slider
  dateSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_ELEVATED,
  },
  dateText: { fontSize: 14.5, fontWeight: '700', color: TEXT_PRIMARY },

  // Calorie Summary Card
  summaryCard: { padding: 20, gap: 20 },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  circleContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgRing: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  centerTextWrapper: { alignItems: 'center', justifyContent: 'center' },
  centerNumber: { fontSize: 26, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  centerLabel: { fontSize: 11, color: TEXT_TERTIARY, marginTop: 2, fontWeight: '600' },
  metricsTextSide: { gap: 16 },
  metricSideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricSideDot: { width: 10, height: 10, borderRadius: 5 },
  metricSideLabel: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricSideVal: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY, marginTop: 1 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER },

  // Macros
  macrosContainer: { gap: 14 },
  macroCol: { gap: 6 },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  macroQty: { fontSize: 12, fontWeight: '700', color: TEXT_PRIMARY },
  progressBarBg: {
    height: 6,
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  // Food Diary
  diaryHeaderWrap: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  mealSection: { gap: 10, marginTop: 4 },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  mealTypeName: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  mealTypeCalories: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1, fontWeight: '500' },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: ACCENT_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addMealBtnText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
  mealSectionCard: { padding: 0, overflow: 'hidden' },
  emptyMealState: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  emptyMealText: { fontSize: 12, color: TEXT_TERTIARY, fontWeight: '500' },

  // Meal Rows
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  mealRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  mealImage: { width: 38, height: 38, borderRadius: 8, backgroundColor: SURFACE_CONTAINER_LOW },
  mealImageFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: SURFACE_CONTAINER_LOW,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  mealInfo: { flex: 1, gap: 3 },
  mealName: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  mealMacros: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '400' },
  mealCaloriesText: { fontSize: 13.5, fontWeight: '700', color: TEXT_PRIMARY },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186,26,26,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.12)',
  },

  // Weight Modal
  wmContainer: { flex: 1, justifyContent: 'flex-end' },
  wmBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  wmSheet: { backgroundColor: SURFACE_ELEVATED, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  wmHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: OUTLINE_VARIANT, marginBottom: 4 },
  wmTitle: { color: TEXT_PRIMARY, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  wmSub: { color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  wmForm: { gap: 14 },
  wmLabel: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase' },
  wmInput: { height: 48, backgroundColor: SURFACE_CONTAINER_LOW, borderWidth: 1, borderColor: OUTLINE_VARIANT, borderRadius: 14, paddingHorizontal: 14, color: TEXT_PRIMARY, fontSize: 15, fontWeight: '500' },
  wmActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  wmCancel: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: SURFACE_CONTAINER_LOW },
  wmCancelText: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
  wmSave: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: PRIMARY },
  wmSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: 16,
    ...SHADOW_LG,
  },
  fab: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 48,
    gap: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
