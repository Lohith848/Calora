import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
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
  SUCCESS,
} from '@/lib/theme'
import { analyzeFoodImage } from '@/lib/gemini'
import { useAddMeal, type MealType } from '@/hooks/useMeals'
import { adjustBrightness } from '@/lib/utils'

const { width: SW } = Dimensions.get('window')

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()

  // Dynamic default meal type depending on current hour
  const getSuggestedMealType = (): MealType => {
    if (params.mealType) return params.mealType as MealType
    const h = new Date().getHours()
    if (h >= 5 && h < 11) return 'breakfast'
    if (h >= 11 && h < 16) return 'lunch'
    if (h >= 16 && h < 22) return 'dinner'
    return 'snack'
  }

  // Scanner Steps: 'picker' | 'scanning' | 'editor'
  const [step, setStep] = useState<'picker' | 'scanning' | 'editor'>('picker')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageFormat, setImageFormat] = useState<string>('image/jpeg')
  const [base64Data, setBase64Data] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor form values
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('0')
  const [protein, setProtein] = useState('0')
  const [carbs, setCarbs] = useState('0')
  const [fat, setFat] = useState('0')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealType>(getSuggestedMealType())

  // Add meal hook
  // Format is YYYY-MM-DD local
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const addMealMutation = useAddMeal(getLocalDateString(new Date()))

  // Reanimated loop for the scanning laser line
  const laserProgress = useSharedValue(0)

  useEffect(() => {
    if (step === 'scanning') {
      laserProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    } else {
      laserProgress.value = 0
    }
  }, [step])

  const laserStyle = useAnimatedStyle(() => {
    return {
      top: `${laserProgress.value * 100}%`,
    }
  })

  // Permission checks
  const checkPermissions = async (type: 'camera' | 'library') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setError('Camera permission is required to snap food photos.')
        return false
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setError('Gallery access permission is required to choose photos.')
        return false
      }
    }
    setError(null)
    return true
  }

  // Handle Photo Picker / Snapper
  const handleSelectImage = async (source: 'camera' | 'gallery') => {
    const isGranted = await checkPermissions(source === 'camera' ? 'camera' : 'library')
    if (!isGranted) return

    let result
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      }

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options)
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options)
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setImageUri(asset.uri)
        setBase64Data(asset.base64 ?? null)
        
        // Infer extension type or default
        const fileExt = asset.uri.split('.').pop()?.toLowerCase()
        setImageFormat(fileExt === 'png' ? 'image/png' : 'image/jpeg')

        setStep('scanning')
        triggerAnalysis(asset.base64 ?? '', fileExt === 'png' ? 'image/png' : 'image/jpeg')
      }
    } catch (e) {
      console.error('Image selection error:', e)
      setError('Could not access image. Please try again.')
    }
  }

  // Execute Gemini AI analysis
  const triggerAnalysis = async (base64: string, mime: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeFoodImage(base64, mime)
      
      setName(result.name)
      setCalories(String(result.calories))
      setProtein(String(result.protein))
      setCarbs(String(result.carbs))
      setFat(String(result.fat))
      setDescription(result.description)

      setStep('editor')
    } catch (err: any) {
      setError(err?.message || 'Gemini AI was unable to estimate this image.')
      setStep('picker')
    } finally {
      setLoading(false)
    }
  }

  // Commit meal logs to AsyncStorage / Supabase
  const handleSaveMeal = async () => {
    const finalCalories = parseInt(calories, 10) || 0
    const finalProtein = parseInt(protein, 10) || 0
    const finalCarbs = parseInt(carbs, 10) || 0
    const finalFat = parseInt(fat, 10) || 0

    if (!name.trim()) {
      setError('Please provide a name for this meal.')
      return
    }

    try {
      setLoading(true)
      await addMealMutation.mutateAsync({
        name: name.trim(),
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
        mealType,
        imageUrl: imageUri || undefined,
      })
      router.replace('/(tabs)')
    } catch (err) {
      setError('Failed to log food into diary. Please check connections.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header bar */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>AI Calorie Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#f87171" style={{ marginTop: 1 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1: PICKER */}
        {step === 'picker' && (
          <View style={s.pickerContainer}>
            <View style={[s.scannerIconBox, { backgroundColor: ACCENT_DIM, borderColor: ACCENT_BORDER }]}>
              <Ionicons name="camera" size={44} color={ACCENT} />
            </View>
            
            <Text style={s.pickerTitle}>Analyze Any Meal instantly</Text>
            <Text style={s.pickerSub}>
              Snap a picture or select an existing photo. Gemini AI will analyze the food items and compute calories and macros.
            </Text>

            <View style={s.pickerButtonWrap}>
              <Pressable
                onPress={() => handleSelectImage('camera')}
                style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={[ACCENT, '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.gradientBtn}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={s.actionBtnText}>Snap a Photo</Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => handleSelectImage('gallery')}
                style={({ pressed }) => [
                  s.secondaryBtn,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Ionicons name="image" size={20} color="#fff" />
                <Text style={s.secondaryBtnText}>Choose from Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* STEP 2: SCANNING */}
        {step === 'scanning' && imageUri && (
          <View style={s.scanProgressContainer}>
            <View style={s.scanFrame}>
              <Image source={{ uri: imageUri }} style={s.scannedPreview} />
              
              {/* Laser line overlay */}
              <Animated.View style={[s.laserLine, laserStyle]}>
                <LinearGradient
                  colors={['transparent', ACCENT, 'transparent']}
                  style={{ flex: 1 }}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              </Animated.View>
            </View>

            <View style={s.scanningStatusBox}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={s.scanningStatusTitle}>NutriAI is scanning food...</Text>
              <Text style={s.scanningStatusSub}>Estimating weight, calories, and macronutrients.</Text>
            </View>
          </View>
        )}

        {/* STEP 3: EDITOR */}
        {step === 'editor' && (
          <View style={s.editorContainer}>
            {/* Scanned Mini Image Preview */}
            <View style={s.editorHeroCard}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.editorThumbnail} />
              ) : (
                <View style={s.editorThumbnailFallback}>
                  <Ionicons name="restaurant" size={24} color={TEXT_TERTIARY} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.editorAnalysisTitle}>AI Scan Complete</Text>
                <Text style={s.editorAnalysisDesc} numberOfLines={3}>
                  {description || 'Adjust coordinates or values below if the estimation needs tuning.'}
                </Text>
              </View>
            </View>

            {/* Editing Sheet */}
            <Card style={s.sheetCard}>
              <Text style={s.formHeader}>Verify Details</Text>

              {/* Name */}
              <View style={s.inputGroup}>
                <Text style={s.label}>FOOD ITEM NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Avocado Toast"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  style={s.textInput}
                />
              </View>

              {/* Meal Type segment */}
              <View style={s.inputGroup}>
                <Text style={s.label}>MEAL CATEGORY</Text>
                <View style={s.mealSegmentContainer}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
                    const active = mealType === type
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setMealType(type)}
                        style={[s.segmentChip, active && s.segmentChipActive]}
                      >
                        <Text style={[s.segmentText, active && s.segmentTextActive]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              {/* Calories Row */}
              <View style={s.inputGroup}>
                <Text style={s.label}>CALORIES (KCAL)</Text>
                <TextInput
                  value={calories}
                  onChangeText={(v) => setCalories(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={s.textInput}
                />
              </View>

              {/* Macros Columns */}
              <View style={s.macroRow}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={[s.label, { color: '#10b981' }]}>PROTEIN (G)</Text>
                  <TextInput
                    value={protein}
                    onChangeText={(v) => setProtein(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>

                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={[s.label, { color: '#fbbf24' }]}>CARBS (G)</Text>
                  <TextInput
                    value={carbs}
                    onChangeText={(v) => setCarbs(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>

                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={[s.label, { color: '#f87171' }]}>FAT (G)</Text>
                  <TextInput
                    value={fat}
                    onChangeText={(v) => setFat(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={s.editorActions}>
                <Pressable
                  onPress={handleSaveMeal}
                  disabled={loading}
                  style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={[ACCENT, '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.gradientBtn}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={s.actionBtnText}>Add to Daily Diary</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => setStep('picker')}
                  disabled={loading}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={s.secondaryBtnText}>Cancel & Scan New</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BG,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  content: { padding: 20, gap: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: { color: ERROR, fontSize: 13, flex: 1, lineHeight: 18 },

  // Picker Mode
  pickerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 16 },
  scannerIconBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  pickerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.4 },
  pickerSub: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 16,
  },
  pickerButtonWrap: { width: '100%', gap: 12 },
  actionBtn: { borderRadius: 14, overflow: 'hidden' },
  gradientBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Scanning Mode
  scanProgressContainer: { alignItems: 'center', gap: 28, paddingVertical: 20 },
  scanFrame: {
    width: SW - 40,
    height: (SW - 40) * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  scannedPreview: { width: '100%', height: '100%' },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scanningStatusBox: { alignItems: 'center', gap: 8 },
  scanningStatusTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scanningStatusSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },

  // Editor Mode
  editorContainer: { gap: 16 },
  editorHeroCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  editorThumbnail: { width: 72, height: 72, borderRadius: 10 },
  editorThumbnailFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorAnalysisTitle: { fontSize: 15, fontWeight: '700', color: SUCCESS },
  editorAnalysisDesc: { fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18 },

  sheetCard: { padding: 18, gap: 18 },
  formHeader: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  inputGroup: { gap: 8 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: TEXT_SECONDARY },
  textInput: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 14.5,
  },
  mealSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    justifyContent: 'space-between',
  },
  segmentChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentChipActive: { backgroundColor: SURFACE2, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  segmentText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },

  macroRow: { flexDirection: 'row', gap: 12 },
  editorActions: { gap: 12, marginTop: 8 },
})
