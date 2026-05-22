import React, { useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  ACCENT,
  ACCENT_DIM,
  ACCENT_BORDER,
  BG,
  SURFACE,
  SURFACE2,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ERROR,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useMeals, useDeleteMeal, type MealLog, type MealType } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'
import { useProfile } from '@/hooks/useProfile'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  // State to hold selected date (local date context)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Local date formatter helper: YYYY-MM-DD in local time
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const dateString = getLocalDateString(selectedDate)

  // Load backend/local hooks
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

  // Date picker operations
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

  // Macro metrics sums
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

  // Split meals by type
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

  // Visual SVG Ring Config
  const ringSize = 140
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressRatio = totals.calories / calorieGoal
  const strokeDashoffset = circumference - Math.min(1, progressRatio) * circumference

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 90 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header (Greeting & Streak) */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>
              {greeting}, {(profile?.fullName ?? '').split(' ')[0] || 'User'}
            </Text>
            <Text style={s.subGreeting}>Let's hit your nutritional goals.</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={s.streakText}>{streak} Day{streak !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Date Selector Slider */}
        <View style={s.dateSlider}>
          <Pressable onPress={() => changeDate(-1)} style={s.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT_SECONDARY} />
          </Pressable>
          <Text style={s.dateText}>{dateLabel}</Text>
          <Pressable onPress={() => changeDate(1)} style={s.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={TEXT_SECONDARY} />
          </Pressable>
        </View>

        {/* Calorie Goal Visual Summary */}
        <Card style={s.summaryCard}>
          <View style={s.summaryMain}>
            {/* SVG Progress Circle */}
            <View style={s.circleContainer}>
              <Svg width={ringSize} height={ringSize} style={s.svgRing}>
                {/* Background path */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress path */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={ACCENT}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </Svg>
              {/* Central Text */}
              <View style={s.centerTextWrapper}>
                <Text style={s.centerNumber}>
                  {remainingCalories >= 0 ? remainingCalories : Math.abs(remainingCalories)}
                </Text>
                <Text style={s.centerLabel}>
                  {remainingCalories >= 0 ? 'kcal left' : 'kcal over'}
                </Text>
              </View>
            </View>

            {/* Side Calories Details */}
            <View style={s.metricsTextSide}>
              <View style={s.metricSideRow}>
                <View style={[s.metricSideDot, { backgroundColor: ACCENT }]} />
                <View>
                  <Text style={s.metricSideLabel}>Goal</Text>
                  <Text style={s.metricSideVal}>{calorieGoal} kcal</Text>
                </View>
              </View>

              <View style={s.metricSideRow}>
                <View style={[s.metricSideDot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
                <View>
                  <Text style={s.metricSideLabel}>Logged</Text>
                  <Text style={s.metricSideVal}>{totals.calories} kcal</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Macro Progress Bars */}
          <View style={s.macrosContainer}>
            {/* Protein */}
            <MacroProgress
              name="Protein"
              value={totals.protein}
              goal={proteinGoal}
              color="#10b981"
              unit="g"
            />
            {/* Carbs */}
            <MacroProgress
              name="Carbs"
              value={totals.carbs}
              goal={carbsGoal}
              color="#fbbf24"
              unit="g"
            />
            {/* Fat */}
            <MacroProgress
              name="Fat"
              value={totals.fat}
              goal={fatGoal}
              color="#f87171"
              unit="g"
            />
          </View>
        </Card>

        {/* Categorized Food Diary */}
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
                        <Ionicons name="trash-outline" size={15} color="rgba(248,113,113,0.7)" />
                      </Pressable>
                    </View>
                  ))
                )}
              </Card>
            </View>
          )
        })}
      </ScrollView>

      {/* Floating Action Button (FAB) for scanning */}
      <View style={[s.fabContainer, { bottom: insets.bottom + TAB_BAR_CLEARANCE + 16 }]}>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }]}
        >
          <LinearGradient
            colors={[ACCENT, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fabGradient}
          >
            <Ionicons name="camera" size={22} color="#fff" />
            <Text style={s.fabText}>Scan Meal</Text>
          </LinearGradient>
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
  greeting: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subGreeting: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Date Slider
  dateSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dateText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },

  // Calorie Visual Card
  summaryCard: { padding: 18, gap: 16 },
  summaryMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  circleContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  svgRing: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  centerTextWrapper: { alignItems: 'center', justifyContent: 'center' },
  centerNumber: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  centerLabel: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, fontWeight: '500' },
  metricsTextSide: { gap: 16 },
  metricSideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricSideDot: { width: 8, height: 8, borderRadius: 4 },
  metricSideLabel: { fontSize: 11, color: TEXT_TERTIARY, fontWeight: '600', textTransform: 'uppercase' },
  metricSideVal: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 1 },

  divider: { height: 1, backgroundColor: BORDER },

  // Macro Progress Lines
  macrosContainer: { gap: 12 },
  macroCol: { gap: 6 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  macroName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  macroQty: { fontSize: 12, fontWeight: '600', color: '#fff' },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  // Food Diary Sections
  diaryHeaderWrap: { marginTop: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  mealSection: { gap: 10, marginTop: 4 },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  mealTypeName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  mealTypeCalories: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 1 },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT_DIM,
    borderColor: ACCENT_BORDER,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addMealBtnText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
  mealSectionCard: { padding: 0, overflow: 'hidden' },
  emptyMealState: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  emptyMealText: { fontSize: 12, color: TEXT_TERTIARY, fontWeight: '500' },

  // Meal Logs Rows
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  mealRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  mealImage: { width: 38, height: 38, borderRadius: 8, backgroundColor: SURFACE2 },
  mealImageFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  mealInfo: { flex: 1, gap: 3 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  mealMacros: { fontSize: 11, color: TEXT_SECONDARY },
  mealCaloriesText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.12)',
  },

  // FAB button
  fabContainer: {
    position: 'absolute',
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fab: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  fabGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
})

