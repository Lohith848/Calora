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
  WARNING,
  CARBS,
  ENERGY_ORANGE,
} from '@/lib/theme'
import { analyzeFoodImage } from '@/lib/gemini'
import { useAddMeal, useUpdateMeal, type MealType } from '@/hooks/useMeals'
import { adjustBrightness } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'

const { width: SW, height: SH } = Dimensions.get('window')

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams()
  const { showToast } = useToast()

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

  // Simulated flash state
  const [showFlash, setShowFlash] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<'0.5x' | '1x' | '2x'>('1x')

  // Editor form values
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('0')
  const [protein, setProtein] = useState('0')
  const [carbs, setCarbs] = useState('0')
  const [fat, setFat] = useState('0')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealType>(getSuggestedMealType())

  // Add / Update meal hooks
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const dateString = getLocalDateString(new Date())
  const addMealMutation = useAddMeal(dateString)
  const updateMealMutation = useUpdateMeal(dateString)

  // Prepopulate if fixing results
  useEffect(() => {
    if (params.mealId) {
      setName(params.name as string ?? '')
      setCalories(params.calories as string ?? '0')
      setProtein(params.protein as string ?? '0')
      setCarbs(params.carbs as string ?? '0')
      setFat(params.fat as string ?? '0')
      setImageUri(params.imageUrl as string ?? null)
      setDescription('Edit and correct the calorie / macro breakdown below.')
      setStep('editor')
    }
  }, [params.mealId])

  // Reanimated loop for the scanning laser line
  const laserProgress = useSharedValue(0)

  // Floating tags bounce offsets
  const floatAnim1 = useSharedValue(0)
  const floatAnim2 = useSharedValue(0)
  const floatAnim3 = useSharedValue(0)
  const floatAnim4 = useSharedValue(0)

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

  useEffect(() => {
    if (step === 'picker') {
      floatAnim1.value = withRepeat(withSequence(withTiming(-6, { duration: 1500 }), withTiming(6, { duration: 1500 })), -1, true)
      floatAnim2.value = withRepeat(withSequence(withTiming(-8, { duration: 1800 }), withTiming(8, { duration: 1800 })), -1, true)
      floatAnim3.value = withRepeat(withSequence(withTiming(-5, { duration: 1300 }), withTiming(5, { duration: 1300 })), -1, true)
      floatAnim4.value = withRepeat(withSequence(withTiming(-7, { duration: 1600 }), withTiming(7, { duration: 1600 })), -1, true)
    }
  }, [step])

  const laserStyle = useAnimatedStyle(() => {
    return {
      top: `${laserProgress.value * 100}%`,
    }
  })

  // Tag styles
  const tagStyle1 = useAnimatedStyle(() => ({ transform: [{ translateY: floatAnim1.value }] }))
  const tagStyle2 = useAnimatedStyle(() => ({ transform: [{ translateY: floatAnim2.value }] }))
  const tagStyle3 = useAnimatedStyle(() => ({ transform: [{ translateY: floatAnim3.value }] }))
  const tagStyle4 = useAnimatedStyle(() => ({ transform: [{ translateY: floatAnim4.value }] }))

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

  // Simulate snapping the Salad Bowl photo from camera preview
  const handleShutterPress = async () => {
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 200)

    const mockSaladUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTt9gDVHkqeKWsACkBbT2dYk3G3zA9TtFXWc7FV_oGRpXV4PVpzQviSIW2dmG35kHkX8ZDUkihwz33kuIxrUeQyAh92GgNxRABb4_vT4TjxhbcfIZHYiH-6XkKfTDVZXzgh-DUH16w9tHHjRX0AB7tZ3bD2kcBBFils2HpoMcQYqMVwWgVTeCYogGAvpV0-lQL38BLpmd0if6KlfAOm-DK4OYMt4h_mJkJj4g7VuR2zNIAuc3H_K5e-iDQDQrUvEGZWD9h1iol7g'
    setImageUri(mockSaladUri)
    setStep('scanning')
    setLoading(true)

    // Simulate scanning network delay
    await new Promise((resolve) => setTimeout(resolve, 2400))

    setName('Caesar Salad with Cherry Tomatoes')
    setCalories('330')
    setProtein('8')
    setCarbs('20')
    setFat('18')
    setDescription('A fresh Caesar salad with crisp romaine lettuce, toasted croutons, cherry tomatoes, and shaved parmesan cheese.')
    setStep('editor')
    setLoading(false)
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
      if (params.mealId) {
        // Update existing meal
        await updateMealMutation.mutateAsync({
          id: params.mealId as string,
          userId: 'local-user',
          name: name.trim(),
          calories: finalCalories,
          protein: finalProtein,
          carbs: finalCarbs,
          fat: finalFat,
          mealType,
          imageUrl: imageUri || undefined,
          loggedAt: new Date().toISOString(),
        })
        showToast('Meal details updated', 'success')
      } else {
        // Add new meal
        await addMealMutation.mutateAsync({
          name: name.trim(),
          calories: finalCalories,
          protein: finalProtein,
          carbs: finalCarbs,
          fat: finalFat,
          mealType,
          imageUrl: imageUri || undefined,
        })
        showToast('Meal logged to diary', 'success')
      }
      router.replace('/(tabs)')
    } catch (err) {
      setError('Failed to log food into diary. Please check connections.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* simulated flash visual element */}
      {showFlash && <View style={s.flashEffectOverlay} />}

      {/* Header overlay for camera picker step */}
      {step === 'picker' && (
        <View style={[s.cameraHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={s.cameraHeaderBtn}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <View style={s.cameraHeaderTitleWrap}>
            <Ionicons name="nutrition" size={18} color="#fff" />
            <Text style={s.cameraHeaderTitle}>Calora</Text>
          </View>
          <Pressable onPress={() => {}} style={s.cameraHeaderBtn}>
            <Ionicons name="help-circle-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Header bar for scanning and editing steps */}
      {step !== 'picker' && (
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => { setStep('picker'); setError(null) }} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>AI Calorie Scanner</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          s.content,
          step === 'picker' && s.contentPickerMode,
          { paddingBottom: insets.bottom + 20 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#f87171" style={{ marginTop: 1 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* STEP 1: CAMERA PICKER VIEW (Simulated Camera Feed + Float Tags) */}
        {step === 'picker' && (
          <View style={s.cameraContainer}>
            {/* Simulated Live View Finder image */}
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTt9gDVHkqeKWsACkBbT2dYk3G3zA9TtFXWc7FV_oGRpXV4PVpzQviSIW2dmG35kHkX8ZDUkihwz33kuIxrUeQyAh92GgNxRABb4_vT4TjxhbcfIZHYiH-6XkKfTDVZXzgh-DUH16w9tHHjRX0AB7tZ3bD2kcBBFils2HpoMcQYqMVwWgVTeCYogGAvpV0-lQL38BLpmd0if6KlfAOm-DK4OYMt4h_mJkJj4g7VuR2zNIAuc3H_K5e-iDQDQrUvEGZWD9h1iol7g' }}
              style={s.cameraFeedImage}
            />
            <View style={s.vignetteOverlay} />

            {/* AI Floating Tag Overlays */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {/* Lettuce */}
              <Animated.View style={[s.floatingTag, { top: '38%', left: '15%' }, tagStyle1]}>
                <View style={s.tagBubble}>
                  <Text style={s.tagText}>Lettuce</Text>
                </View>
                <View style={[s.tagLine, { width: 44, transform: [{ rotate: '15deg' }] }]} />
              </Animated.View>

              {/* Parmesan */}
              <Animated.View style={[s.floatingTag, { top: '32%', right: '15%' }, tagStyle2]}>
                <View style={s.tagBubble}>
                  <Text style={s.tagText}>Parmesan</Text>
                </View>
                <View style={[s.tagLine, { width: 38, transform: [{ rotate: '-15deg' }] }]} />
              </Animated.View>

              {/* Cherry Tomatoes */}
              <Animated.View style={[s.floatingTag, { bottom: '38%', left: '20%' }, tagStyle3]}>
                <View style={s.tagBubble}>
                  <Text style={s.tagText}>Cherry Tomatoes</Text>
                </View>
                <View style={[s.tagLine, { width: 50, transform: [{ rotate: '40deg' }] }]} />
              </Animated.View>

              {/* Croutons */}
              <Animated.View style={[s.floatingTag, { bottom: '32%', right: '22%' }, tagStyle4]}>
                <View style={s.tagBubble}>
                  <Text style={s.tagText}>Croutons</Text>
                </View>
                <View style={[s.tagLine, { width: 40, transform: [{ rotate: '-25deg' }] }]} />
              </Animated.View>
            </View>

            {/* Zoom Controls Overlay */}
            <View style={s.zoomControlsOverlay}>
              {(['0.5x', '1x', '2x'] as const).map((z) => {
                const active = zoomLevel === z
                return (
                  <Pressable
                    key={z}
                    onPress={() => setZoomLevel(z)}
                    style={[s.zoomBtn, active && s.zoomBtnActive]}
                  >
                    <Text style={[s.zoomText, active && s.zoomTextActive]}>{z}</Text>
                  </Pressable>
                )
              })}
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
                  colors={['transparent', '#34C759', 'transparent']}
                  style={{ flex: 1 }}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              </Animated.View>
            </View>

            <View style={s.scanningStatusBox}>
              <ActivityIndicator size="small" color="#34C759" />
              <Text style={s.scanningStatusTitle}>Calora is scanning food...</Text>
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
                  {description || 'Adjust values below if the food estimation needs tuning.'}
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
                  placeholder="e.g. Salad Bowl"
                  placeholderTextColor="rgba(0,0,0,0.25)"
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
                  <Text style={[s.label, { color: SUCCESS }]}>PROTEIN (G)</Text>
                  <TextInput
                    value={protein}
                    onChangeText={(v) => setProtein(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>

                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={[s.label, { color: CARBS }]}>CARBS (G)</Text>
                  <TextInput
                    value={carbs}
                    onChangeText={(v) => setCarbs(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={s.textInput}
                  />
                </View>

                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={[s.label, { color: WARNING }]}>FAT (G)</Text>
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
                    colors={['#000000', '#222222']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.gradientBtn}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={s.actionBtnText}>
                          {params.mealId ? 'Save Corrections' : 'Add to Daily Diary'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => setStep('picker')}
                  disabled={loading}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    pressed && { backgroundColor: 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={20} color={TEXT_PRIMARY} />
                  <Text style={[s.secondaryBtnText, { color: TEXT_PRIMARY }]}>Cancel & Re-scan</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Camera shutter control bar at bottom (Only Picker Step) */}
      {step === 'picker' && (
        <View style={s.cameraFooter}>
          {/* Scan mode selector */}
          <View style={s.modeSelector}>
            <View style={s.modeOptionColActive}>
              <Ionicons name="scan-outline" size={20} color="#fff" />
              <Text style={s.modeTextActive}>SCAN FOOD</Text>
              <View style={s.modeActiveDot} />
            </View>
            <View style={s.modeOptionCol}>
              <Ionicons name="barcode-outline" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={s.modeText}>BARCODE</Text>
            </View>
            <View style={s.modeOptionCol}>
              <Ionicons name="document-text-outline" size={20} color="rgba(255,255,255,0.4)" />
              <Text style={s.modeText}>FOOD LABEL</Text>
            </View>
          </View>

          {/* Shutter actions */}
          <View style={s.shutterRow}>
            {/* Flash button */}
            <Pressable style={s.footerCircleBtn}>
              <Ionicons name="flash-off" size={20} color="#fff" />
            </Pressable>

            {/* Shutter circle trigger */}
            <Pressable onPress={handleShutterPress} style={s.shutterBtnOutline}>
              <View style={s.shutterBtnCenter} />
            </Pressable>

            {/* Gallery picker */}
            <Pressable onPress={() => handleSelectImage('gallery')} style={s.footerCircleBtnOverflow}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNP2btwoqA9VleU2phxkVQnjJC5UolHvFHUuQzXZ4vqF6DMdLbUf1jbfZ-B9EMHMVcFByrSczp4TEShZfn6v-nlRRauRfBY47W14MNEwfIQRW74EpQzicdEsRgr8_47MeNGJAeQbNoaIeTarfb6NZQiWl_MoOieFcobiCRh-vPxKe8sZXDiFtVEQ372LuST8F_Ha6q2HMclbwE--SZmOdPNpoX1PJQUbUt6T082cNxmZMK8VGMraT4ay3TQUZqbDGhVi5SkBLikw' }}
                style={s.galleryThumbnailImage}
              />
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  content: { padding: 20, gap: 20 },
  contentPickerMode: { padding: 0, gap: 0 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(186,26,26,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
  },
  errorText: { color: ERROR, fontSize: 13, flex: 1, lineHeight: 18 },

  // Flash element
  flashEffectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },

  // Simulated Camera UI Overlay
  cameraHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  cameraHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  // Camera container
  cameraContainer: {
    width: SW,
    height: SH - 190,
    backgroundColor: '#000',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraFeedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // Floating tags
  floatingTag: {
    position: 'absolute',
    alignItems: 'center',
  },
  tagBubble: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tagText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  tagLine: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // Zoom controls
  zoomControlsOverlay: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  zoomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomBtnActive: {
    backgroundColor: '#ffffff',
  },
  zoomText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  zoomTextActive: {
    color: '#000000',
  },

  // Camera Footer UI
  cameraFooter: {
    height: 190,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 24,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  modeOptionColActive: {
    alignItems: 'center',
    gap: 4,
  },
  modeOptionCol: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.4,
  },
  modeTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.8,
  },
  modeActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 2,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
  },
  footerCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCircleBtnOverflow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  galleryThumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  shutterBtnOutline: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  shutterBtnCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
  },

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
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scanningStatusBox: { alignItems: 'center', gap: 8 },
  scanningStatusTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  scanningStatusSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },

  // Editor Mode
  editorContainer: { gap: 16, marginTop: 10 },
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

  sheetCard: { padding: 18, gap: 18, elevation: 1 },
  formHeader: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.3 },
  inputGroup: { gap: 8 },
  label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: TEXT_SECONDARY },
  textInput: {
    height: 48,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: TEXT_PRIMARY,
    fontSize: 14.5,
  },
  mealSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: BG,
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
  segmentChipActive: { backgroundColor: SURFACE, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  segmentText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '600' },
  segmentTextActive: { color: TEXT_PRIMARY, fontWeight: '700' },

  macroRow: { flexDirection: 'row', gap: 12 },
  editorActions: { gap: 12, marginTop: 8 },
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
    backgroundColor: SURFACE,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
})
