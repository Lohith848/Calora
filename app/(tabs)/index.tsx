import React, { useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  SURFACE,
  SURFACE2,
  SURFACE3,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ERROR,
  SUCCESS,
  WARNING,
  CARBS,
  ENERGY_ORANGE,
  STREAK_RED,
  WATER_CYAN,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useMeals, useDeleteMeal, type MealLog, type MealType } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'
import { useProfile } from '@/hooks/useProfile'

const { width: SW } = Dimensions.get('window')

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  // Selected date context
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Local date formatter helper: YYYY-MM-DD
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const dateString = getLocalDateString(selectedDate)

  // Load backend/local hooks
  const { data: profile } = useProfile()
  const { data: meals = [], refetch: refetchMeals } = useMeals(dateString)
  const { data: goals } = useGoals()
  const { data: streak = 0 } = useStreak()
  const deleteMealMutation = useDeleteMeal(dateString)

  // Format date headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate the 7 days of the week containing the selectedDate (Sunday to Saturday)
  const calendarWeek = useMemo(() => {
    const dates = []
    const current = new Date(selectedDate)
    const day = current.getDay() // 0 = Sun, 1 = Mon, etc.
    const sunday = new Date(current)
    sunday.setDate(current.getDate() - day)

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [selectedDate])

  const changeDate = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(selectedDate.getDate() + offset)
    setSelectedDate(next)
  }

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

  // Format timestamp (e.g. 12:37pm)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      let hours = d.getHours()
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const ampm = hours >= 12 ? 'pm' : 'am'
      hours = hours % 12
      hours = hours ? hours : 12 // the hour '0' should be '12'
      return `${hours}:${minutes}${ampm}`
    } catch {
      return '12:00pm'
    }
  }

  // Main Calorie Ring Config
  const ringSize = 88
  const strokeWidth = 8
  const radius = (ringSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressRatio = calorieGoal > 0 ? totals.calories / calorieGoal : 0
  const strokeDashoffset = circumference - Math.min(1, progressRatio) * circumference

  return (
    <View style={s.root}>
      {/* TopAppBar header */}
      <View style={[s.appHeader, { paddingTop: insets.top + 8 }]}>
        <View style={s.profileContainer}>
          <View style={s.avatarCircle}>
            <Ionicons name="person" size={20} color={TEXT_SECONDARY} />
          </View>
          <Text style={s.appTitle}>Calora</Text>
        </View>
        <View style={s.streakBadge}>
          <Text style={s.streakText}>{streak} 🔥</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={[
          s.container,
          { paddingBottom: TAB_BAR_CLEARANCE + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEXT_PRIMARY} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly Calendar Strip */}
        <View style={s.calendarStrip}>
          {calendarWeek.map((dateItem, idx) => {
            const isSelected = getLocalDateString(dateItem) === dateString
            const isToday = getLocalDateString(dateItem) === getLocalDateString(new Date())
            const dayLabel = weekdays[dateItem.getDay()]
            const dateNum = dateItem.getDate()

            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedDate(dateItem)}
                style={s.calendarDayCol}
              >
                <Text style={[s.calendarDayLabel, isSelected && s.calendarDayLabelActive]}>
                  {dayLabel}
                </Text>
                <View
                  style={[
                    s.calendarDateCircle,
                    isSelected && s.calendarDateCircleActive,
                    !isSelected && isToday && s.calendarDateCircleToday,
                  ]}
                >
                  <Text style={[s.calendarDateText, isSelected && s.calendarDateTextActive]}>
                    {dateNum}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>

        {/* Main Calorie Progress Ring Card */}
        <Card style={s.calorieCard}>
          <View style={s.calorieMain}>
            <View>
              <View style={s.calorieNumberRow}>
                <Text style={s.calorieTotalText}>{totals.calories}</Text>
                <Text style={s.calorieGoalText}>/{calorieGoal}</Text>
              </View>
              <Text style={s.calorieSubtitle}>Calories eaten</Text>
            </View>

            {/* SVG Progress Circle */}
            <View style={{ width: ringSize, height: ringSize }}>
              <Svg width={ringSize} height={ringSize} style={s.svgRing}>
                {/* Background track */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress path */}
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  stroke={TEXT_PRIMARY}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </Svg>
              <View style={s.circleCenterIcon}>
                <Ionicons name="flame" size={24} color={ENERGY_ORANGE} style={{ marginTop: 2 }} />
              </View>
            </View>
          </View>
        </Card>

        {/* Macros Grid */}
        <View style={s.macrosGrid}>
          {/* Protein Card */}
          <View style={s.macroCard}>
            <MacroProgressRing
              value={totals.protein}
              goal={proteinGoal}
              color={SUCCESS}
              iconName="barbell"
            />
            <Text style={s.macroQtyText}>
              {totals.protein}
              <Text style={s.macroGoalQtyText}>/{proteinGoal}g</Text>
            </Text>
            <Text style={s.macroSubtitle}>Protein eaten</Text>
          </View>

          {/* Carbs Card */}
          <View style={s.macroCard}>
            <MacroProgressRing
              value={totals.carbs}
              goal={carbsGoal}
              color={CARBS}
              iconName="pizza"
            />
            <Text style={s.macroQtyText}>
              {totals.carbs}
              <Text style={s.macroGoalQtyText}>/{carbsGoal}g</Text>
            </Text>
            <Text style={s.macroSubtitle}>Carbs eaten</Text>
          </View>

          {/* Fat Card */}
          <View style={s.macroCard}>
            <MacroProgressRing
              value={totals.fat}
              goal={fatGoal}
              color={WARNING}
              iconName="water"
            />
            <Text style={s.macroQtyText}>
              {totals.fat}
              <Text style={s.macroGoalQtyText}>/{fatGoal}g</Text>
            </Text>
            <Text style={s.macroSubtitle}>Fat eaten</Text>
          </View>
        </View>

        {/* Recently Uploaded Feed Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recently uploaded</Text>
          <Pressable onPress={() => {}} hitSlop={8}>
            <Text style={s.sectionActionText}>See all</Text>
          </Pressable>
        </View>

        {meals.length === 0 ? (
          <Card style={s.emptyStateCard}>
            <Ionicons name="restaurant-outline" size={32} color={TEXT_TERTIARY} />
            <Text style={s.emptyStateText}>No food logs recorded for this day.</Text>
            <Pressable
              onPress={() => router.push('/scan')}
              style={({ pressed }) => [s.emptyStateBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.emptyStateBtnText}>Log First Meal</Text>
            </Pressable>
          </Card>
        ) : (
          <View style={s.mealsList}>
            {meals.slice().reverse().map((meal, index) => (
              <Pressable
                key={meal.id}
                onPress={() => router.push(`/detail/${meal.id}`)}
                style={({ pressed }) => [
                  s.recentMealCard,
                  pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
                ]}
              >
                {meal.imageUrl ? (
                  <Image source={{ uri: meal.imageUrl }} style={s.recentMealImage} />
                ) : (
                  <View style={s.recentMealImageFallback}>
                    <Ionicons name="restaurant-outline" size={24} color={TEXT_TERTIARY} />
                  </View>
                )}

                <View style={s.recentMealContent}>
                  <View style={s.recentMealTopRow}>
                    <Text style={s.recentMealName} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={s.recentMealTime}>{formatTime(meal.loggedAt)}</Text>
                  </View>

                  <View style={s.recentMealCalorieRow}>
                    <Ionicons name="flame" size={14} color={ENERGY_ORANGE} />
                    <Text style={s.recentMealCalorieText}>{meal.calories} Calories</Text>
                  </View>

                  <View style={s.recentMealMacrosRow}>
                    <View style={s.recentMealMacroItem}>
                      <View style={[s.macroDot, { backgroundColor: SUCCESS }]} />
                      <Text style={s.recentMealMacroText}>{meal.protein}g</Text>
                    </View>
                    <View style={s.recentMealMacroItem}>
                      <View style={[s.macroDot, { backgroundColor: CARBS }]} />
                      <Text style={s.recentMealMacroText}>{meal.carbs}g</Text>
                    </View>
                    <View style={s.recentMealMacroItem}>
                      <View style={[s.macroDot, { backgroundColor: WARNING }]} />
                      <Text style={s.recentMealMacroText}>{meal.fat}g</Text>
                    </View>
                  </View>
                </View>

                {/* Trash delete button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation()
                    handleDelete(meal.id)
                  }}
                  hitSlop={12}
                  style={({ pressed }) => [s.recentMealDeleteBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="trash-outline" size={16} color={STREAK_RED} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB: Log Food (+) */}
      <View style={[s.fabContainer, { bottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.92 }] }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}

function MacroProgressRing({
  value,
  goal,
  color,
  iconName,
  size = 48,
  strokeWidth = 4.5,
}: {
  value: number
  goal: number
  color: string
  iconName: keyof typeof Ionicons.glyphMap
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressRatio = goal > 0 ? value / goal : 0
  const strokeDashoffset = circumference - Math.min(1, progressRatio) * circumference

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.04)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Ionicons name={iconName} size={size * 0.4} color={color} />
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 20, gap: 20, paddingTop: 12 },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  streakBadge: {
    backgroundColor: SURFACE2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // Calendar Strip
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  calendarDayCol: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  calendarDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  calendarDayLabelActive: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },
  calendarDateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateCircleActive: {
    backgroundColor: TEXT_PRIMARY,
  },
  calendarDateCircleToday: {
    borderWidth: 1,
    borderColor: TEXT_PRIMARY,
  },
  calendarDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  calendarDateTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Calorie Progress Ring Card
  calorieCard: {
    padding: 20,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  calorieMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calorieTotalText: {
    fontSize: 36,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  calorieGoalText: {
    fontSize: 18,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  calorieSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  svgRing: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  circleCenterIcon: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Macros Grid
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  macroQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  macroGoalQtyText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  macroSubtitle: {
    fontSize: 10.5,
    color: TEXT_SECONDARY,
    marginTop: 3,
    fontWeight: '500',
  },

  // Recently Uploaded Feed
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.4,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  emptyStateCard: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptyStateBtn: {
    backgroundColor: TEXT_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyStateBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#fff',
  },
  mealsList: {
    gap: 12,
  },
  recentMealCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    gap: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  recentMealImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: SURFACE2,
  },
  recentMealImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  recentMealContent: {
    flex: 1,
    gap: 4,
  },
  recentMealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentMealName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    maxWidth: SW * 0.4,
  },
  recentMealTime: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  recentMealCalorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentMealCalorieText: {
    fontSize: 13,
    fontWeight: '700',
    color: ENERGY_ORANGE,
  },
  recentMealMacrosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  recentMealMacroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentMealMacroText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  recentMealDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB button
  fabContainer: {
    position: 'absolute',
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
