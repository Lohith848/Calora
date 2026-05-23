import React, { useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, {
  Circle,
  Path,
  Line,
  Text as SvgText,
} from 'react-native-svg'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  SURFACE,
  SURFACE2,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  SUCCESS,
  WARNING,
  CARBS,
  ENERGY_ORANGE,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useWeeklyMeals, useMeals } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'

const { width: SW } = Dimensions.get('window')

type PeriodType = '90D' | '6M' | '1Y' | 'ALL'

export default function ProgressScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('6M')

  const { data: weeklyDays = [] } = useWeeklyMeals()
  const { data: goals } = useGoals()
  const { data: streak = 0 } = useStreak()

  const calorieGoal = goals?.calories ?? 2000
  const proteinGoal = goals?.protein ?? 130
  const carbsGoal = goals?.carbs ?? 220
  const fatGoal = goals?.fat ?? 70

  // Weight data (mock for UI)
  const currentWeight = 132.1
  const goalWeight = 140

  const stats = useMemo(() => {
    if (weeklyDays.length === 0) {
      return { average: 0, protein: 0, carbs: 0, fat: 0 }
    }
    const totals = weeklyDays.reduce(
      (acc, d) => {
        acc.calories += d.calories
        acc.protein += d.protein
        acc.carbs += d.carbs
        acc.fat += d.fat
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    const count = weeklyDays.filter((d) => d.calories > 0).length || 1
    return {
      average: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbs: Math.round(totals.carbs / count),
      fat: Math.round(totals.fat / count),
    }
  }, [weeklyDays])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meals-weekly'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['streak'] }),
    ])
    setRefreshing(false)
  }

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = new Date().getDay()

  // Chart dimensions
  const chartWidth = SW - 80
  const chartHeight = 120

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 32 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEXT_PRIMARY} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Progress</Text>
      </View>

      {/* Hero Stats Bento Row */}
      <View style={s.bentoRow}>
        {/* Weight Card */}
        <View style={s.bentoCard}>
          <Text style={s.bentoLabel}>Your Weight</Text>
          <View style={s.weightRow}>
            <Text style={s.weightValue}>{currentWeight}</Text>
            <Text style={s.weightUnit}> lbs</Text>
          </View>
          <View style={s.progressBarContainer}>
            <View style={s.progressBarTrack}>
              <View
                style={[
                  s.progressBarFill,
                  { width: `${Math.min(100, (currentWeight / goalWeight) * 100)}%` },
                ]}
              />
            </View>
            <Text style={s.goalText}>Goal {goalWeight} lbs</Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.logWeightBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.logWeightBtnText}>Log Weight</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Streak Card */}
        <View style={s.bentoCard}>
          <View style={s.streakCenter}>
            <View style={s.streakIconContainer}>
              <Ionicons name="flame" size={44} color={ENERGY_ORANGE} />
              <Text style={s.streakCount}>{streak || 21}</Text>
            </View>
            <Text style={s.streakLabel}>Day Streak</Text>
          </View>
          <View style={s.weekDots}>
            {weekdays.map((day, index) => (
              <View key={index} style={s.weekDotCol}>
                <Text style={s.weekDotLabel}>{day}</Text>
                <View
                  style={[
                    s.weekDot,
                    { backgroundColor: index <= today ? ENERGY_ORANGE : '#e8e8e8' },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Weight Progress Chart Card */}
      <Card style={s.chartCard}>
        <View style={s.chartHeader}>
          <View>
            <Text style={s.chartTitle}>Weight Progress</Text>
            <View style={s.chartSubtitleRow}>
              <Ionicons name="flag" size={12} color={SUCCESS} />
              <Text style={s.chartSubtitle}>
                {Math.round((currentWeight / goalWeight) * 100)}% of goal
              </Text>
            </View>
          </View>
          <Pressable style={s.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={TEXT_PRIMARY} />
          </Pressable>
        </View>

        {/* SVG Line Chart */}
        <View style={s.chartContainer}>
          <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Grid Lines */}
            <Line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f1f1" strokeWidth="1" />
            <Line x1="0" y1="50" x2={chartWidth} y2="50" stroke="#f1f1f1" strokeWidth="1" />
            <Line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#f1f1f1" strokeWidth="1" />
            <Line x1="0" y1="110" x2={chartWidth} y2="110" stroke="#f1f1f1" strokeWidth="1" />
            {/* Area Fill */}
            <Path
              d={`M0 100 Q ${chartWidth * 0.15} 110, ${chartWidth * 0.3} 80 T ${chartWidth * 0.6} 60 T ${chartWidth * 0.9} 40 L ${chartWidth * 0.9} 120 L 0 120 Z`}
              fill="rgba(0, 0, 0, 0.05)"
            />
            {/* Line Path */}
            <Path
              d={`M0 100 Q ${chartWidth * 0.15} 110, ${chartWidth * 0.3} 80 T ${chartWidth * 0.6} 60 T ${chartWidth * 0.9} 40`}
              stroke="#000"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Current Point */}
            <Circle
              cx={chartWidth * 0.6}
              cy={60}
              r={4}
              fill="black"
              stroke="white"
              strokeWidth={2}
            />
          </Svg>
        </View>

        {/* Period Selector */}
        <View style={s.periodRow}>
          {(['90D', '6M', '1Y', 'ALL'] as PeriodType[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={[
                s.periodBtn,
                selectedPeriod === period && s.periodBtnActive,
              ]}
            >
              <Text
                style={[
                  s.periodBtnText,
                  selectedPeriod === period && s.periodBtnTextActive,
                ]}
              >
                {period}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Insight Pill */}
        <View style={s.insightPill}>
          <Text style={s.insightPillText}>
            Great job! Consistency is key, and you're mastering it!
          </Text>
        </View>
      </Card>

      {/* Nutrition Summary Card */}
      <Card style={s.nutritionCard}>
        <Text style={s.nutritionLabel}>Daily Average Calories</Text>
        <View style={s.nutritionValueRow}>
          <Text style={s.nutritionValue}>{stats.average || 2861}</Text>
          <View style={s.nutritionTrend}>
            <Ionicons name="trending-down" size={18} color={SUCCESS} />
            <Text style={s.nutritionTrendText}>10%</Text>
          </View>
        </View>
        <View style={s.macroRow}>
          {/* Protein */}
          <View style={s.macroItem}>
            <Text style={s.macroLabel}>Protein</Text>
            <View style={s.macroBarTrack}>
              <View
                style={[
                  s.macroBarFill,
                  {
                    backgroundColor: SUCCESS,
                    width: `${Math.min(100, ((stats.protein || 142) / proteinGoal) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.macroValueText}>{stats.protein || 142}g</Text>
          </View>
          {/* Carbs */}
          <View style={s.macroItem}>
            <Text style={s.macroLabel}>Carbs</Text>
            <View style={[s.macroBarTrack, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <View
                style={[
                  s.macroBarFill,
                  {
                    backgroundColor: CARBS,
                    width: `${Math.min(100, ((stats.carbs || 234) / carbsGoal) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.macroValueText}>{stats.carbs || 234}g</Text>
          </View>
          {/* Fats */}
          <View style={s.macroItem}>
            <Text style={s.macroLabel}>Fats</Text>
            <View style={[s.macroBarTrack, { backgroundColor: 'rgba(255,204,0,0.1)' }]}>
              <View
                style={[
                  s.macroBarFill,
                  {
                    backgroundColor: WARNING,
                    width: `${Math.min(100, ((stats.fat || 68) / fatGoal) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.macroValueText}>{stats.fat || 68}g</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 24 },
  header: { gap: 4 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },

  // Bento Grid
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  bentoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: TEXT_SECONDARY,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: SURFACE2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: TEXT_PRIMARY,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  logWeightBtn: {
    marginTop: 20,
    backgroundColor: TEXT_PRIMARY,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logWeightBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Streak Card
  streakCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  streakIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    top: 12,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 2,
  },
  weekDotCol: {
    alignItems: 'center',
    gap: 6,
  },
  weekDotLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Chart Card
  chartCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  chartSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: SUCCESS,
  },
  moreBtn: {
    backgroundColor: SURFACE2,
    padding: 8,
    borderRadius: 999,
  },
  chartContainer: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Period Selector
  periodRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE2,
    padding: 4,
    borderRadius: 10,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: SURFACE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  periodBtnTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
  },

  // Insight Pill
  insightPill: {
    marginTop: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  insightPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: SUCCESS,
    textAlign: 'center',
  },

  // Nutrition Summary Card
  nutritionCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  nutritionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  nutritionValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  nutritionValue: {
    fontSize: 36,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  nutritionTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  nutritionTrendText: {
    fontSize: 14,
    fontWeight: '600',
    color: SUCCESS,
    marginLeft: 2,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
  },
  macroItem: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  macroBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
})
