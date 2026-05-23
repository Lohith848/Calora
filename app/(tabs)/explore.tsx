import React, { useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  SURFACE_ELEVATED,
  ON_SURFACE,
  ON_SURFACE_VARIANT,
  OUTLINE,
  OUTLINE_VARIANT,
  PRIMARY,
  ACCENT_DIM,
  PROTEIN_GREEN,
  ENERGY_ORANGE,
  CARB_BLUE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  BG,
  BORDER,
  SHADOW_SM,
  SUCCESS,
  WARNING,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useWeeklyMeals, useMeals, type MealLog } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'

const { width: SW } = Dimensions.get('window')

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data: weeklyDays = [], isLoading: loadingWeekly } = useWeeklyMeals()
  const { data: goals } = useGoals()
  const { data: streak = 0 } = useStreak()

  const calorieGoal = goals?.calories ?? 2000

  const stats = useMemo(() => {
    if (weeklyDays.length === 0) {
      return { average: 0, highest: 0, activeDays: 0, goalDays: 0 }
    }

    const calorieList = weeklyDays.map((d) => d.calories)
    const sum = calorieList.reduce((a, b) => a + b, 0)
    const average = Math.round(sum / weeklyDays.length)
    const highest = Math.max(...calorieList)
    const activeDays = weeklyDays.filter((d) => d.calories > 0).length

    const goalDays = weeklyDays.filter(
      (d) => d.calories > 0 && d.calories <= calorieGoal
    ).length

    return { average, highest, activeDays, goalDays }
  }, [weeklyDays, calorieGoal])

  const chartHeight = 180
  const chartWidth = SW - 64
  const chartMaxVal = useMemo(() => {
    const maxVal = stats.highest
    return Math.max(maxVal, calorieGoal, 1000) * 1.15
  }, [stats.highest, calorieGoal])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meals-weekly'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
      queryClient.invalidateQueries({ queryKey: ['streak'] }),
    ])
    setRefreshing(false)
  }

  const goalY = chartHeight - 30 - ((calorieGoal / chartMaxVal) * (chartHeight - 50))

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={[
        s.container,
        { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 32 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Analytics</Text>
        <Text style={s.subtitle}>Weekly calorie and macro logging reports.</Text>
      </View>

      {/* Calorie Bar Chart Card */}
      <Card style={s.chartCard}>
        <View style={s.chartHeaderRow}>
          <View>
            <Text style={s.chartCardLabel}>Weekly Trend</Text>
            <Text style={s.chartCardVal}>{stats.average} kcal / day avg</Text>
          </View>
          <View style={s.legendItem}>
            <View style={s.legendLine} />
            <Text style={s.legendText}>Goal</Text>
          </View>
        </View>

        {/* SVG Drawing Canvas */}
        <View style={s.svgContainer}>
          {weeklyDays.length === 0 ? (
            <View style={s.chartEmptyState}>
              <Text style={s.emptyStateText}>No data logged this week</Text>
            </View>
          ) : (
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={ENERGY_ORANGE} stopOpacity="1" />
                  <Stop offset="1" stopColor={ENERGY_ORANGE} stopOpacity="0.2" />
                </SvgLinearGradient>
              </Defs>

              {/* Goal Target Dashed Line */}
              <Line
                x1="0"
                y1={goalY}
                x2={chartWidth}
                y2={goalY}
                stroke={ENERGY_ORANGE}
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Render Bars */}
              {weeklyDays.map((day, i) => {
                const totalBars = weeklyDays.length
                const barWidth = 24
                const gap = (chartWidth - totalBars * barWidth) / (totalBars - 1)
                const x = i * (barWidth + gap)

                const usableHeight = chartHeight - 50
                const barHeight = (day.calories / chartMaxVal) * usableHeight
                const y = chartHeight - 25 - barHeight

                return (
                  <React.Fragment key={day.dateStr}>
                    {/* Bar */}
                    {day.calories > 0 && (
                      <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 4)}
                        rx="4"
                        fill="url(#barGrad)"
                      />
                    )}
                    {/* Calorie quantity label (above bar) */}
                    {day.calories > 0 && (
                      <SvgText
                        x={x + barWidth / 2}
                        y={y - 6}
                        fill={TEXT_PRIMARY}
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {day.calories}
                      </SvgText>
                    )}
                    {/* Day text (X axis label) */}
                    <SvgText
                      x={x + barWidth / 2}
                      y={chartHeight - 6}
                      fill={day.calories > 0 ? TEXT_PRIMARY : TEXT_TERTIARY}
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {day.dayName}
                    </SvgText>
                  </React.Fragment>
                )
              })}
            </Svg>
          )}
        </View>
      </Card>

      {/* Grid of Highlight Stats */}
      <Text style={s.sectionTitle}>Weekly Stats</Text>
      <View style={s.statsGrid}>
        <Card style={s.statCard}>
          <Text style={s.statLabel}>Days Logged</Text>
          <Text style={s.statValue}>{stats.activeDays}/7</Text>
          <Text style={s.statDesc}>Days with logged meals</Text>
        </Card>

        <Card style={s.statCard}>
          <Text style={s.statLabel}>Goal Accuracy</Text>
          <Text style={s.statValue}>
            {stats.activeDays > 0 ? Math.round((stats.goalDays / stats.activeDays) * 100) : 0}%
          </Text>
          <Text style={s.statDesc}>Days within budget limit</Text>
        </Card>

        <Card style={s.statCard}>
          <Text style={s.statLabel}>Highest Intake</Text>
          <Text style={s.statValue}>{stats.highest} kcal</Text>
          <Text style={s.statDesc}>Max logged in single day</Text>
        </Card>

        <Card style={s.statCard}>
          <Text style={s.statLabel}>Current Streak</Text>
          <Text style={s.statValue}>{streak} days</Text>
          <Text style={s.statDesc}>Consecutive active days</Text>
        </Card>
      </View>

      {/* Information Insight Alert */}
      <Card style={s.insightAlert}>
        <View style={s.insightAccent} />
        <Ionicons name="sparkles" size={18} color={ENERGY_ORANGE} />
        <View style={{ flex: 1 }}>
          <Text style={s.insightTitle}>Weekly AI Report</Text>
          <Text style={s.insightDesc}>
            {stats.activeDays === 0
              ? 'Start logging meals to unlock comprehensive reports and predictions on weight and trends.'
              : stats.average > calorieGoal
              ? `You are averaging ${stats.average - calorieGoal} kcal above your daily target. Try using smaller snack sizes.`
              : 'Excellent! Your average calorie intake is right on track. You are highly consistent this week.'}
          </Text>
        </View>
      </Card>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  header: { gap: 4, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: TEXT_SECONDARY },

  // Chart Card Styles
  chartCard: { padding: 16, gap: 16 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartCardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: TEXT_SECONDARY, letterSpacing: 0.5 },
  chartCardVal: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 14, height: 2, backgroundColor: ENERGY_ORANGE, borderRadius: 1 },
  legendText: { fontSize: 11, color: TEXT_SECONDARY, fontWeight: '600' },
  svgContainer: { height: 180, alignItems: 'center', justifyContent: 'center' },
  chartEmptyState: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: TEXT_TERTIARY, fontSize: 13, fontWeight: '500' },

  // Highlights Stats
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: -4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (SW - 52) / 2,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY },
  statValue: { fontSize: 18, fontWeight: '800', color: ON_SURFACE },
  statDesc: { fontSize: 10, color: TEXT_TERTIARY, lineHeight: 14 },

  // Insight box
  insightAlert: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 14,
    overflow: 'hidden',
  },
  insightAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: ENERGY_ORANGE,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  insightTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  insightDesc: { fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18, marginTop: 4 },
})
