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

import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Fonts } from '@/lib/typography'
import {
  SURFACE_ELEVATED,
  SURFACE_CONTAINER_LOW,
  ON_SURFACE,
  ON_SURFACE_VARIANT,
  OUTLINE,
  OUTLINE_VARIANT,
  PRIMARY,
  PROTEIN_GREEN,
  CARB_BLUE,
  FAT_YELLOW,
  SHADOW_SM,
  ACCENT,
  ACCENT_DIM,
  ACCENT_BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  BG,
  BORDER,
  ERROR,
  ERROR_DIM,
  SUCCESS,
} from '@/lib/theme'
import { analyzeFoodImage } from '@/lib/gemini'
import { useAddMeal, type MealType } from '@/hooks/useMeals'

const { width: SW } = Dimensions.get('window')

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()

  const getSuggestedMealType = (): MealType => {
    if (params.mealType) return params.mealType as MealType
    const h = new Date().getHours()
    if (h >= 5 && h < 11) return 'breakfast'
    if (h >= 11 && h < 16) return 'lunch'
    if (h >= 16 && h < 22) return 'dinner'
    return 'snack'
  }

  const [step, setStep] = useState<'picker' | 'scanning' | 'editor'>('picker')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageFormat, setImageFormat] = useState<string>('image/jpeg')
  const [base64Data, setBase64Data] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('0')
  const [protein, setProtein] = useState('0')
  const [carbs, setCarbs] = useState('0')
  const [fat, setFat] = useState('0')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealType>(getSuggestedMealType())

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const addMealMutation = useAddMeal(getLocalDateString(new Date()))

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

  const laserStyle = useAnimatedStyle(() => ({
    top: `${laserProgress.value * 100}%`,
  }))

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
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={ON_SURFACE} />
        </Pressable>
        <Text style={[s.headerTitle, { fontWeight: '700' }]}>AI Calorie Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={ERROR} style={{ marginTop: 1 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {step === 'picker' && (
          <View style={s.pickerContainer}>
            <View style={s.cameraIconWrap}>
              <View style={s.cameraIconInner}>
                <Ionicons name="camera-outline" size={36} color={PRIMARY} />
              </View>
            </View>

            <Text style={[s.pickerTitle, { fontWeight: '800' }]}>Analyze Any Meal</Text>
            <Text style={s.pickerSub}>
              Snap a picture or select an existing photo. Gemini AI will analyze the food
              items and compute calories and macros.
            </Text>

            <View style={s.pickerActions}>
              <Pressable
                onPress={() => handleSelectImage('camera')}
                style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={s.primaryBtnText}>Snap a Photo</Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectImage('gallery')}
                style={({ pressed }) => [s.outlineBtn, pressed && s.outlineBtnPressed]}
              >
                <Ionicons name="images-outline" size={20} color={PRIMARY} />
                <Text style={s.outlineBtnText}>Choose from Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 'scanning' && imageUri && (
          <View style={s.scanContainer}>
            <View style={s.scanFrame}>
              <Image source={{ uri: imageUri }} style={s.scanImage} />
              <Animated.View style={[s.laserLine, laserStyle]}>
                <View style={s.laserTrack}>
                  <View style={s.laserGlow} />
                </View>
              </Animated.View>
            </View>

            <View style={s.scanStatus}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={[s.scanStatusTitle, { fontWeight: '700' }]}>Calora is scanning food...</Text>
              <Text style={s.scanStatusSub}>Estimating weight, calories, and macronutrients.</Text>
            </View>
          </View>
        )}

        {step === 'editor' && (
          <View style={s.editorContainer}>
            <View style={s.heroCard}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.heroThumb} />
              ) : (
                <View style={s.heroThumbFallback}>
                  <Ionicons name="restaurant-outline" size={22} color={TEXT_TERTIARY} />
                </View>
              )}
              <View style={s.heroBody}>
                <Text style={[s.heroTitle, { fontWeight: '700' }]} numberOfLines={1}>AI Scan Complete</Text>
                <Text style={s.heroDesc} numberOfLines={2}>
                  {description || 'Adjust coordinates or values below if the estimation needs tuning.'}
                </Text>
              </View>
            </View>

            <Card style={s.sheetCard}>
              <Text style={[s.formTitle, { fontWeight: '800' }]}>Verify Details</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>FOOD ITEM NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Avocado Toast"
                  placeholderTextColor={OUTLINE}
                  style={s.textInput}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>MEAL CATEGORY</Text>
                <View style={s.segmentWrap}>
                  {MEAL_TYPES.map((type) => {
                    const active = mealType === type
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setMealType(type)}
                        style={[s.segmentChip, active && s.segmentChipActive]}
                      >
                        <Text
                          style={[s.segmentLabel, active && s.segmentLabelActive, { fontWeight: active ? '700' : '600' }]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>CALORIES (KCAL)</Text>
                <TextInput
                  value={calories}
                  onChangeText={(v) => setCalories(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  style={s.textInput}
                />
              </View>

              <View style={s.macroRow}>
                <View style={s.macroField}>
                  <Text style={[s.fieldLabel, { color: PROTEIN_GREEN }]}>PROTEIN (G)</Text>
                  <TextInput
                    value={protein}
                    onChangeText={(v) => setProtein(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>
                <View style={s.macroField}>
                  <Text style={[s.fieldLabel, { color: CARB_BLUE }]}>CARBS (G)</Text>
                  <TextInput
                    value={carbs}
                    onChangeText={(v) => setCarbs(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>
                <View style={s.macroField}>
                  <Text style={[s.fieldLabel, { color: FAT_YELLOW }]}>FAT (G)</Text>
                  <TextInput
                    value={fat}
                    onChangeText={(v) => setFat(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>
              </View>

              <View style={s.editorActions}>
                <Pressable
                  onPress={handleSaveMeal}
                  disabled={loading}
                  style={({ pressed }) => [s.primaryBtn, pressed && s.primaryBtnPressed]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={s.primaryBtnText}>Add to Daily Diary</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setStep('picker')}
                  disabled={loading}
                  style={({ pressed }) => [s.outlineBtn, pressed && s.outlineBtnPressed]}
                >
                  <Ionicons name="refresh-outline" size={20} color={PRIMARY} />
                  <Text style={s.outlineBtnText}>Cancel & Scan New</Text>
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
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE_ELEVATED,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE_CONTAINER_LOW,
  },
  headerTitle: {
    fontSize: 17,
    color: TEXT_PRIMARY,
  },
  content: {
    padding: 20,
    gap: 20,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: ERROR_DIM,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: ERROR,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Picker
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  cameraIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1.5,
    borderColor: ACCENT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cameraIconInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: SURFACE_ELEVATED,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },
  pickerTitle: {
    fontSize: 24,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  pickerSub: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 8,
  },
  pickerActions: {
    width: '100%',
    gap: 12,
  },

  // Buttons
  primaryBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 27,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE_ELEVATED,
  },
  outlineBtnPressed: {
    backgroundColor: SURFACE_CONTAINER_LOW,
  },
  outlineBtnText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },

  // Scanning
  scanContainer: {
    alignItems: 'center',
    gap: 28,
    paddingVertical: 20,
  },
  scanFrame: {
    width: SW - 40,
    height: (SW - 40) * 0.75,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE_CONTAINER_LOW,
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    alignItems: 'center',
  },
  laserTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: PROTEIN_GREEN,
    opacity: 0.7,
    shadowColor: PROTEIN_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  laserGlow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: PROTEIN_GREEN,
    opacity: 0.3,
    shadowColor: PROTEIN_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  scanStatus: {
    alignItems: 'center',
    gap: 8,
  },
  scanStatusTitle: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  scanStatusSub: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  // Editor
  editorContainer: {
    gap: 16,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    ...SHADOW_SM,
  },
  heroThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  heroThumbFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: SURFACE_CONTAINER_LOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 15,
    color: SUCCESS,
  },
  heroDesc: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },

  sheetCard: {
    padding: 20,
    gap: 20,
  },
  formTitle: {
    fontSize: 17,
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: TEXT_SECONDARY,
  },
  textInput: {
    height: 50,
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderWidth: 1,
    borderColor: OUTLINE_VARIANT,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: ON_SURFACE,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderWidth: 1,
    borderColor: OUTLINE_VARIANT,
    borderRadius: 14,
    padding: 3,
  },
  segmentChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentChipActive: {
    backgroundColor: SURFACE_ELEVATED,
    ...SHADOW_SM,
  },
  segmentLabel: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
  },
  segmentLabelActive: {
    color: TEXT_PRIMARY,
  },

  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroField: {
    flex: 1,
    gap: 8,
  },
  editorActions: {
    gap: 12,
    marginTop: 4,
  },
})
