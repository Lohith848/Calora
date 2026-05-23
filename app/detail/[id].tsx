import React, { useState, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  BORDER,
  SURFACE,
  SURFACE2,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_DISABLED,
  ACCENT,
  SUCCESS,
  WARNING,
  CARBS,
  ENERGY_ORANGE,
} from '@/lib/theme'
import { useMeal, useUpdateMeal, useDeleteMeal } from '@/hooks/useMeals'
import { useToast } from '@/contexts/ToastContext'

const { width: SW } = Dimensions.get('window')

interface Ingredient {
  name: string
  amount: string
  calories: number
}

// Generate realistic mock ingredients based on the meal name
function getMockIngredients(mealName: string, totalCal: number): Ingredient[] {
  const name = mealName.toLowerCase()
  
  if (name.includes('salad')) {
    return [
      { name: 'Romaine Lettuce', amount: '1.5 cups', calories: Math.round(totalCal * 0.1) },
      { name: 'Grilled Chicken Breast', amount: '100g', calories: Math.round(totalCal * 0.45) },
      { name: 'Shaved Parmesan Cheese', amount: '2 tbsp', calories: Math.round(totalCal * 0.25) },
      { name: 'Toasted Croutons', amount: '12 pieces', calories: Math.round(totalCal * 0.2) },
    ]
  }
  
  if (name.includes('salmon') || name.includes('fish')) {
    return [
      { name: 'Atlantic Salmon Fillet', amount: '150g', calories: Math.round(totalCal * 0.6) },
      { name: 'Tri-color Quinoa', amount: '0.5 cup', calories: Math.round(totalCal * 0.25) },
      { name: 'Steamed Broccoli Florette', amount: '1 cup', calories: Math.round(totalCal * 0.05) },
      { name: 'Lemon Vinaigrette Dressing', amount: '1 tbsp', calories: Math.round(totalCal * 0.1) },
    ]
  }

  if (name.includes('egg') || name.includes('toast') || name.includes('avocado')) {
    return [
      { name: 'Whole Wheat Toast', amount: '1 slice', calories: Math.round(totalCal * 0.25) },
      { name: 'Fresh Hass Avocado', amount: '0.5 fruit', calories: Math.round(totalCal * 0.35) },
      { name: 'Poached Eggs', amount: '2 large', calories: Math.round(totalCal * 0.35) },
      { name: 'Cherry Tomatoes', amount: '4 halves', calories: Math.round(totalCal * 0.05) },
    ]
  }

  if (name.includes('burger') || name.includes('beef') || name.includes('steak')) {
    return [
      { name: 'Beef Patty (85% Lean)', amount: '110g', calories: Math.round(totalCal * 0.45) },
      { name: 'Brioche Burger Bun', amount: '1 piece', calories: Math.round(totalCal * 0.3) },
      { name: 'Cheddar Cheese Slice', amount: '1 slice', calories: Math.round(totalCal * 0.15) },
      { name: 'Lettuce, Tomato & Onion', amount: 'mixed', calories: Math.round(totalCal * 0.1) },
    ]
  }

  if (name.includes('smoothie') || name.includes('shake') || name.includes('bowl')) {
    return [
      { name: 'Vanilla Whey Protein', amount: '1 scoop', calories: Math.round(totalCal * 0.35) },
      { name: 'Frozen Banana', amount: '1 medium', calories: Math.round(totalCal * 0.35) },
      { name: 'Organic Almond Milk', amount: '1 cup', calories: Math.round(totalCal * 0.15) },
      { name: 'Mixed Berries & Granola', amount: '2 tbsp', calories: Math.round(totalCal * 0.15) },
    ]
  }

  // Generic fallback split:
  return [
    { name: `${mealName} Base`, amount: '1 portion', calories: Math.round(totalCal * 0.7) },
    { name: 'Savory Seasoning & Oil', amount: '1 tsp', calories: Math.round(totalCal * 0.2) },
    { name: 'Fresh Garnish Herbs', amount: '1 pinch', calories: Math.round(totalCal * 0.1) },
  ]
}

export default function DetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { showToast } = useToast()

  // Load backend hooks
  const { data: meal, isLoading } = useMeal(id ?? '')
  
  // Format local date string from meal
  const dateString = useMemo(() => {
    if (!meal) return ''
    const d = new Date(meal.loggedAt)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [meal])

  const updateMealMutation = useUpdateMeal(dateString)
  const deleteMealMutation = useDeleteMeal(dateString)

  // Serving scale factor state
  const [servingCount, setServingCount] = useState(1)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [saving, setSaving] = useState(false)

  // Calculate scaled nutritional metrics
  const scaledNutrients = useMemo(() => {
    if (!meal) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    return {
      calories: Math.round(meal.calories * servingCount),
      protein: Math.round(meal.protein * servingCount),
      carbs: Math.round(meal.carbs * servingCount),
      fat: Math.round(meal.fat * servingCount),
    }
  }, [meal, servingCount])

  // Get ingredients list (memoized)
  const ingredients = useMemo(() => {
    if (!meal) return []
    return getMockIngredients(meal.name, meal.calories)
  }, [meal])

  // Format logged date time (e.g. 6:21 PM)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      let hours = d.getHours()
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      return `${hours}:${minutes} ${ampm}`
    } catch {
      return '12:00 PM'
    }
  }

  // Adjust serving count
  const adjustServings = (val: number) => {
    const next = servingCount + val
    if (next >= 0.5 && next <= 5) {
      setServingCount(next)
    }
  }

  // Done button handler: updates the meal with the current servings adjustment
  const handleSaveAndDone = async () => {
    if (!meal) return
    setSaving(true)
    try {
      await updateMealMutation.mutateAsync({
        ...meal,
        calories: scaledNutrients.calories,
        protein: scaledNutrients.protein,
        carbs: scaledNutrients.carbs,
        fat: scaledNutrients.fat,
      })
      showToast('Meal updated successfully', 'success')
      router.back()
    } catch (e) {
      showToast('Failed to update serving size', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Fix Results edit handler
  const handleFixResults = () => {
    showToast('Editing raw food labels...', 'info')
    // Open scanner editor again to review details
    router.replace(`/scan?mealId=${meal?.id}&name=${meal?.name}&calories=${scaledNutrients.calories}&protein=${scaledNutrients.protein}&carbs=${scaledNutrients.carbs}&fat=${scaledNutrients.fat}&imageUrl=${meal?.imageUrl || ''}`)
  }

  // iOS Native Share
  const handleShare = async () => {
    if (!meal) return
    try {
      await Share.share({
        message: `Check out my meal on Calora! 🥗\n${meal.name} - ${scaledNutrients.calories} kcal (P: ${scaledNutrients.protein}g · C: ${scaledNutrients.carbs}g · F: ${scaledNutrients.fat}g)`,
      })
    } catch (e) {
      console.warn('Share failed:', e)
    }
  }

  if (isLoading) {
    return (
      <View style={[s.centered, { backgroundColor: BG }]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    )
  }

  if (!meal) {
    return (
      <View style={[s.centered, { backgroundColor: BG }]}>
        <Text style={s.notFoundTitle}>Meal Log not found</Text>
        <Pressable onPress={() => router.back()} style={s.notFoundBtn}>
          <Text style={s.notFoundBtnText}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Top Navigation Overlay */}
      <View style={[s.navigationOverlay, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.overlayCircleBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={s.navigationTitle}>Nutrition</Text>
        <View style={s.navigationRight}>
          <Pressable onPress={handleShare} style={s.overlayCircleBtn}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={handleShare} style={s.overlayCircleBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={s.heroContainer}>
          {meal.imageUrl ? (
            <Image source={{ uri: meal.imageUrl }} style={s.heroImage} />
          ) : (
            <View style={s.heroImageFallback}>
              <Ionicons name="restaurant" size={60} color={TEXT_TERTIARY} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent']}
            style={s.gradientOverlay}
          />
        </View>

        {/* Content Canvas */}
        <View style={s.contentCanvas}>
          {/* Floating Calorie Card */}
          <View style={[s.glassCard, s.floatingCalorieCard]}>
            <View style={s.calorieRowInfo}>
              <View style={s.fireIconBg}>
                <Ionicons name="flame" size={20} color={ENERGY_ORANGE} />
              </View>
              <View>
                <Text style={s.calorieMiniLabel}>CALORIES</Text>
                <Text style={s.calorieValueText}>{scaledNutrients.calories}</Text>
              </View>
            </View>

            {/* Serving Incrementor Counter */}
            <View style={s.servingCounter}>
              <Pressable
                onPress={() => adjustServings(-0.5)}
                style={s.counterBtn}
                hitSlop={8}
              >
                <Ionicons name="remove" size={16} color={TEXT_PRIMARY} />
              </Pressable>
              <Text style={s.servingCountText}>{servingCount}</Text>
              <Pressable
                onPress={() => adjustServings(0.5)}
                style={s.counterBtn}
                hitSlop={8}
              >
                <Ionicons name="add" size={16} color={TEXT_PRIMARY} />
              </Pressable>
            </View>
          </View>

          {/* Main Nutrition Card */}
          <Card style={s.nutritionCard}>
            <View style={s.nutritionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.timeRow}>
                  <Ionicons name="time-outline" size={13} color={TEXT_SECONDARY} />
                  <Text style={s.timeLabelText}>{formatTime(meal.loggedAt)}</Text>
                </View>
                <Text style={s.mealNameTitle}>{meal.name}</Text>
              </View>
              <Pressable
                onPress={() => setIsBookmarked(!isBookmarked)}
                hitSlop={12}
                style={s.bookmarkBtn}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isBookmarked ? ENERGY_ORANGE : TEXT_SECONDARY}
                />
              </Pressable>
            </View>

            {/* Macro Bar Breakdown Grid */}
            <View style={s.macrosBreakdownGrid}>
              {/* Protein */}
              <View style={s.macroBarCol}>
                <Text style={[s.macroLabel, { color: SUCCESS }]}>Protein</Text>
                <Text style={s.macroValueAmt}>{scaledNutrients.protein}g</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { backgroundColor: SUCCESS, width: '40%' }]} />
                </View>
              </View>

              {/* Carbs */}
              <View style={s.macroBarCol}>
                <Text style={[s.macroLabel, { color: CARBS }]}>Carbs</Text>
                <Text style={s.macroValueAmt}>{scaledNutrients.carbs}g</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { backgroundColor: CARBS, width: '25%' }]} />
                </View>
              </View>

              {/* Fats */}
              <View style={s.macroBarCol}>
                <Text style={[s.macroLabel, { color: WARNING }]}>Fats</Text>
                <Text style={s.macroValueAmt}>{scaledNutrients.fat}g</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { backgroundColor: WARNING, width: '60%' }]} />
                </View>
              </View>
            </View>

            {/* Ingredients List */}
            <View style={s.ingredientsSection}>
              <View style={s.ingredientsHeader}>
                <Text style={s.ingredientsTitle}>Ingredients</Text>
                <Pressable onPress={handleFixResults} style={s.addMoreBtn} hitSlop={10}>
                  <Ionicons name="add" size={16} color={CARBS} />
                  <Text style={s.addMoreBtnText}>Add more</Text>
                </Pressable>
              </View>

              <View style={s.ingredientsList}>
                {ingredients.map((ing, index) => {
                  const scaledIngCalories = Math.round(ing.calories * servingCount)
                  
                  return (
                    <View key={index} style={s.ingredientRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.ingredientNameText}>
                          {ing.name}{' '}
                          <Text style={s.ingredientCaloriesSuffix}>• {scaledIngCalories} cal</Text>
                        </Text>
                        <Text style={s.ingredientAmountText}>{ing.amount}</Text>
                      </View>
                      <Ionicons name="reorder-two-outline" size={20} color={TEXT_DISABLED} />
                    </View>
                  )
                })}
              </View>
            </View>
          </Card>

          {/* Sticky Bottom Actions */}
          <View style={s.actionsRow}>
            <Pressable
              onPress={handleFixResults}
              style={({ pressed }) => [
                s.secondaryActionBtn,
                pressed && { backgroundColor: 'rgba(0,0,0,0.05)' },
              ]}
            >
              <Ionicons name="create-outline" size={16} color={TEXT_PRIMARY} />
              <Text style={s.secondaryActionBtnText}>Fix Results</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveAndDone}
              disabled={saving}
              style={({ pressed }) => [
                s.primaryActionBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.primaryActionBtnText}>Done</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '700' },
  notFoundBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  notFoundBtnText: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '600' },

  // Navigation Overlay
  navigationOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
  },
  overlayCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  navigationRight: {
    flexDirection: 'row',
    gap: 8,
  },

  // Hero Section
  heroContainer: {
    width: SW,
    height: SW,
    backgroundColor: SURFACE2,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE2,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Content Canvas
  contentCanvas: {
    paddingHorizontal: 20,
    marginTop: -48,
    zIndex: 10,
  },

  // Floating Calorie Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.40)',
  },
  floatingCalorieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  calorieRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fireIconBg: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,149,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    letterSpacing: 0.6,
  },
  calorieValueText: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 28,
  },
  servingCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE2,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 12,
  },
  counterBtn: {
    padding: 4,
  },
  servingCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },

  // Main Nutrition Card
  nutritionCard: {
    padding: 18,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    marginBottom: 20,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabelText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  mealNameTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  bookmarkBtn: {
    padding: 4,
  },

  // Macro Progress Bars
  macrosBreakdownGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: 16,
  },
  macroBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroValueAmt: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 2,
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Ingredients
  ingredientsSection: {
    gap: 12,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: CARBS,
  },
  ingredientsList: {
    gap: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  ingredientNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  ingredientCaloriesSuffix: {
    fontWeight: '400',
    color: TEXT_SECONDARY,
  },
  ingredientAmountText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  // Sticky Bottom Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryActionBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  primaryActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#fff',
  },
})
