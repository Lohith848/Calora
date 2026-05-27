import { useState, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Pressable, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { AlertModal } from '@/components/ui/AppModal'
import SettingsRow from '@/components/ui/SettingsRow'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { logoutRevenueCat } from '@/lib/purchases'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { adjustBrightness } from '@/lib/utils'
import {
    SURFACE_ELEVATED,
    SURFACE_CONTAINER_LOW,
    ON_SURFACE,
    ON_SURFACE_VARIANT,
    OUTLINE,
    OUTLINE_VARIANT,
    PRIMARY,
    PROTEIN_GREEN,
    ENERGY_ORANGE,
    CARB_BLUE,
    FAT_YELLOW,
    SHADOW_SM,
    ACCENT,
    ACCENT_DIM,
    ACCENT_BORDER,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    TEXT_DISABLED,
    BG,
    BORDER,
    ERROR,
    SUCCESS,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useProfile } from '@/hooks/useProfile'
import { useGoals, useUpdateGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'
import { useMeals } from '@/hooks/useMeals'
import { useLatestWeight, useAddWeight, useWeightLogs } from '@/hooks/useWeightTracking'

export default function ProfileScreen() {
    const insets = useSafeAreaInsets()
    const { isPremium, customerInfo } = useSubscription()
    const { data: profile } = useProfile()
    const { data: goals } = useGoals()
    const { data: streak = 0 } = useStreak()
    const updateGoalsMutation = useUpdateGoals()
    const { data: latestWeight } = useLatestWeight()
    const { data: weightLogs = [] } = useWeightLogs()
    const addWeightMutation = useAddWeight()

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const { data: todayMeals = [] } = useMeals(dateStr)
    const { data: weekMeals = [] } = useMeals(dateStr)

    const [signOutModal, setSignOutModal] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
    const [errorModal, setErrorModal] = useState<string | null>(null)

    const [editGoalsModal, setEditGoalsModal] = useState(false)
    const [editCalories, setEditCalories] = useState('2000')
    const [editProtein, setEditProtein] = useState('130')
    const [editCarbs, setEditCarbs] = useState('220')
    const [editFat, setEditFat] = useState('70')
    const [updatingGoals, setUpdatingGoals] = useState(false)
    const [goalsError, setGoalsError] = useState<string | null>(null)

    const [weightModal, setWeightModal] = useState(false)
    const [weightInput, setWeightInput] = useState('')
    const [updatingWeight, setUpdatingWeight] = useState(false)

    const expiryMs = customerInfo?.entitlements.active['premium']?.expirationDate
    const expiryDate = expiryMs
        ? new Date(expiryMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : null

    const todayTotals = useMemo(() => {
        return todayMeals.reduce(
            (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )
    }, [todayMeals])

    async function handleSignOut() {
        setSigningOut(true)
        try {
            track('logout')
            await logoutRevenueCat()
            const { error } = await supabase.auth.signOut()
            if (error) throw error
        } catch (e: any) {
            setErrorModal(e?.message ?? 'Sign out failed. Please try again.')
        } finally {
            setSigningOut(false)
        }
    }

    function openEditModal() {
        setEditCalories(String(goals?.calories ?? 2000))
        setEditProtein(String(goals?.protein ?? 130))
        setEditCarbs(String(goals?.carbs ?? 220))
        setEditFat(String(goals?.fat ?? 70))
        setGoalsError(null)
        setEditGoalsModal(true)
    }

    function handleAutoSplit() {
        const cal = parseInt(editCalories, 10)
        if (isNaN(cal) || cal <= 0) { setGoalsError('Enter a valid calorie target first.'); return }
        const p = Math.round((cal * 0.25) / 4)
        const c = Math.round((cal * 0.45) / 4)
        const f = Math.round((cal * 0.30) / 9)
        setEditProtein(String(p)); setEditCarbs(String(c)); setEditFat(String(f))
        setGoalsError(null)
    }

    async function handleSaveGoals() {
        setUpdatingGoals(true); setGoalsError(null)
        const cal = parseInt(editCalories, 10); const p = parseInt(editProtein, 10)
        const c = parseInt(editCarbs, 10); const f = parseInt(editFat, 10)
        if (isNaN(cal) || cal < 800 || cal > 8000) { setUpdatingGoals(false); setGoalsError('Calories must be between 800 and 8000 kcal.'); return }
        if (isNaN(p) || p < 10 || p > 500) { setUpdatingGoals(false); setGoalsError('Protein must be between 10g and 500g.'); return }
        if (isNaN(c) || c < 10 || c > 1000) { setUpdatingGoals(false); setGoalsError('Carbs must be between 10g and 1000g.'); return }
        if (isNaN(f) || f < 5 || f > 300) { setUpdatingGoals(false); setGoalsError('Fat must be between 5g and 300g.'); return }
        try {
            await updateGoalsMutation.mutateAsync({ calories: cal, protein: p, carbs: c, fat: f })
            setEditGoalsModal(false)
        } catch (err: any) { setGoalsError(err?.message ?? 'Failed to update targets.')
        } finally { setUpdatingGoals(false) }
    }

    async function handleAddWeight() {
        const kg = parseFloat(weightInput)
        if (isNaN(kg) || kg <= 0 || kg >= 500) { return }
        setUpdatingWeight(true)
        try {
            await addWeightMutation.mutateAsync(kg)
            setWeightModal(false)
            setWeightInput('')
        } catch { /* ignore */ }
        finally { setUpdatingWeight(false) }
    }

    const initials = profile?.initials ?? 'U'
    const fullName = profile?.fullName ?? 'User'
    const email = profile?.email ?? ''

    const weightDiff = weightLogs.length >= 2
        ? (weightLogs[weightLogs.length - 1].weightKg - weightLogs[0].weightKg).toFixed(1)
        : null

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
            showsVerticalScrollIndicator={false}
        >
            <Card style={s.heroCard}>
                <View style={s.avatarWrap}>
                    <Text style={s.avatarText}>{initials}</Text>
                    {isPremium && (
                        <View style={s.premiumBadge}>
                            <Ionicons name="sparkles" size={10} color="#fff" />
                        </View>
                    )}
                </View>
                <Text style={s.name}>{fullName}</Text>
                <View style={s.streakRow}>
                    <Ionicons name="flame" size={14} color={ENERGY_ORANGE} />
                    <Text style={s.streakText}>{streak} Day Streak</Text>
                </View>
                <Text style={s.email}>{email}</Text>
            </Card>

            {/* Weight Card */}
            <Card style={s.weightCard}>
                <View style={s.weightTop}>
                    <Ionicons name="scale-outline" size={18} color={TEXT_PRIMARY} />
                    <Text style={s.weightTitle}>Weight</Text>
                </View>
                <View style={s.weightBody}>
                    <Text style={s.weightValue}>
                        {latestWeight ? `${latestWeight.weightKg} kg` : 'Not set'}
                    </Text>
                    {weightDiff && (
                        <Text style={[s.weightDiff, parseFloat(weightDiff) < 0 ? { color: SUCCESS } : { color: ERROR }]}>
                            {parseFloat(weightDiff) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(weightDiff))} kg change
                        </Text>
                    )}
                </View>
                <Pressable
                    onPress={() => setWeightModal(true)}
                    style={({ pressed }) => [s.weightAddBtn, pressed && { opacity: 0.7 }]}
                >
                    <Ionicons name="add-circle-outline" size={14} color={ACCENT} />
                    <Text style={s.weightAddText}>{latestWeight ? 'Update' : 'Log'} Weight</Text>
                </Pressable>
            </Card>

            {isPremium ? (
                <Card style={[s.planCard, { borderColor: ACCENT_BORDER }]}>
                    <View style={s.planTop}>
                        <View style={s.planBadge}>
                            <Ionicons name="sparkles" size={11} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.planTitle}>Premium Active</Text>
                            <Text style={s.planSub}>{expiryDate ? `Renews ${expiryDate}` : 'Billing cycle active'}</Text>
                        </View>
                        <Pressable onPress={() => router.push('/upgrade')} style={s.manageBtn}>
                            <Text style={s.manageBtnText}>Manage</Text>
                        </Pressable>
                    </View>
                </Card>
            ) : (
                <Pressable onPress={() => router.push('/upgrade')} style={s.upgradeCard}>
                    <LinearGradient
                        colors={[PRIMARY, '#333333']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <Ionicons name="sparkles" size={15} color="#fff" />
                    <View style={{ flex: 1 }}>
                        <Text style={s.upgradeTitle}>Upgrade to Premium</Text>
                        <Text style={s.upgradeSub}>Advanced controls, faster support, and all modules.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.8)" />
                </Pressable>
            )}

            <Text style={s.sectionTitle}>Today's Nutrition</Text>
            <Card compact style={s.goalsCard}>
                <MacroRow
                    icon="flame"
                    iconColor={ENERGY_ORANGE}
                    label="Calories"
                    value={`${todayTotals.calories} / ${goals?.calories ?? 2000} kcal`}
                    divider
                />
                <MacroRow
                    icon="fitness"
                    iconColor={PROTEIN_GREEN}
                    label="Protein"
                    value={`${todayTotals.protein} / ${goals?.protein ?? 130}g`}
                    divider
                />
                <MacroRow
                    icon="leaf"
                    iconColor={CARB_BLUE}
                    label="Carbohydrates"
                    value={`${todayTotals.carbs} / ${goals?.carbs ?? 220}g`}
                    divider
                />
                <MacroRow
                    icon="water"
                    iconColor={FAT_YELLOW}
                    label="Fats"
                    value={`${todayTotals.fat} / ${goals?.fat ?? 70}g`}
                    divider
                />
            </Card>

            <Text style={s.sectionTitle}>Nutritional Targets</Text>
            <Card compact style={s.goalsCard}>
                <MacroRow
                    icon="flame"
                    iconColor={ENERGY_ORANGE}
                    label="Daily Calories Goal"
                    value={`${goals?.calories ?? 2000} kcal`}
                    divider
                />
                <MacroRow
                    icon="fitness"
                    iconColor={PROTEIN_GREEN}
                    label="Protein Goal"
                    value={`${goals?.protein ?? 130}g`}
                    divider
                />
                <MacroRow
                    icon="leaf"
                    iconColor={CARB_BLUE}
                    label="Carbohydrates Goal"
                    value={`${goals?.carbs ?? 220}g`}
                    divider
                />
                <MacroRow
                    icon="water"
                    iconColor={FAT_YELLOW}
                    label="Fats Goal"
                    value={`${goals?.fat ?? 70}g`}
                    divider
                />
                <Pressable
                    onPress={openEditModal}
                    style={({ pressed }) => [s.editGoalsBtn, pressed && s.editGoalsBtnPressed]}
                >
                    <Ionicons name="create-outline" size={15} color={TEXT_TERTIARY} />
                    <Text style={s.editGoalsBtnText}>Adjust Targets</Text>
                </Pressable>
            </Card>

            <Text style={s.sectionTitle}>Account</Text>
            <Card compact style={s.sectionCard}>
                <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
                <SettingsRow icon="help-buoy-outline" label="Support" onPress={() => router.push('/support')} />
                <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
                <SettingsRow icon="shield-checkmark-outline" label="Terms of Service" onPress={() => router.push('/terms')} last />
            </Card>

            <Pressable
                onPress={() => setSignOutModal(true)}
                disabled={signingOut}
                style={({ pressed }) => [s.signOutBtn, (pressed || signingOut) && { opacity: 0.8 }]}
            >
                <Ionicons name="log-out-outline" size={17} color="#fff" />
                <Text style={s.signOutText}>{signingOut ? 'Signing out\u2026' : 'Sign out'}</Text>
            </Pressable>

            {/* Weight Modal */}
            <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => !updatingWeight && setWeightModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
                    <Pressable style={s.modalBackdrop} onPress={() => !updatingWeight && setWeightModal(false)} />
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Log Weight</Text>
                        <Text style={s.modalSubtitle}>Enter your current weight in kilograms.</Text>
                        <View style={s.modalForm}>
                            <View style={s.modalInputGroup}>
                                <Text style={s.modalInputLabel}>WEIGHT (KG)</Text>
                                <TextInput
                                    value={weightInput}
                                    onChangeText={(v) => setWeightInput(v.replace(/[^0-9.]/g, ''))}
                                    keyboardType="decimal-pad"
                                    style={s.modalInput}
                                    placeholder="e.g. 72.5"
                                    placeholderTextColor={TEXT_DISABLED}
                                    autoFocus
                                />
                            </View>
                        </View>
                        <View style={s.modalActions}>
                            <Pressable disabled={updatingWeight} onPress={() => setWeightModal(false)} style={s.modalCancelBtn}>
                                <Text style={s.modalCancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                disabled={updatingWeight || !weightInput}
                                onPress={handleAddWeight}
                                style={({ pressed }) => [s.modalSaveBtn, pressed && { opacity: 0.85 }]}
                            >
                                {updatingWeight ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalSaveBtnText}>Save</Text>}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Goals Modal */}
            <Modal visible={editGoalsModal} transparent animationType="fade" onRequestClose={() => !updatingGoals && setEditGoalsModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContainer}>
                    <Pressable style={s.modalBackdrop} onPress={() => !updatingGoals && setEditGoalsModal(false)} />
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Adjust Targets</Text>
                        <Text style={s.modalSubtitle}>Customize your daily calorie budget and macronutrient split goals.</Text>
                        {goalsError ? (
                            <View style={s.goalsErrorBox}><Text style={s.goalsErrorText}>{goalsError}</Text></View>
                        ) : null}
                        <View style={s.modalForm}>
                            <View style={s.modalInputGroup}>
                                <Text style={s.modalInputLabel}>Daily Calories (kcal)</Text>
                                <TextInput value={editCalories} onChangeText={(v) => { setEditCalories(v.replace(/\D/g, '')); setGoalsError(null) }} keyboardType="number-pad" style={s.modalInput} placeholder="2000" placeholderTextColor={TEXT_DISABLED} />
                            </View>
                            <Pressable onPress={handleAutoSplit} style={({ pressed }) => [s.autoSplitBtn, pressed && { opacity: 0.6 }]}>
                                <Ionicons name="calculator-outline" size={14} color={PRIMARY} />
                                <Text style={s.autoSplitBtnText}>Auto-split macros (25% P / 45% C / 30% F)</Text>
                            </Pressable>
                            <View style={s.macroInputsRow}>
                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={[s.modalInputLabel, { color: PROTEIN_GREEN }]}>Protein (g)</Text>
                                    <TextInput value={editProtein} onChangeText={(v) => { setEditProtein(v.replace(/\D/g, '')); setGoalsError(null) }} keyboardType="number-pad" style={s.modalInput} placeholder="130" placeholderTextColor={TEXT_DISABLED} />
                                </View>
                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={[s.modalInputLabel, { color: CARB_BLUE }]}>Carbs (g)</Text>
                                    <TextInput value={editCarbs} onChangeText={(v) => { setEditCarbs(v.replace(/\D/g, '')); setGoalsError(null) }} keyboardType="number-pad" style={s.modalInput} placeholder="220" placeholderTextColor={TEXT_DISABLED} />
                                </View>
                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={[s.modalInputLabel, { color: FAT_YELLOW }]}>Fat (g)</Text>
                                    <TextInput value={editFat} onChangeText={(v) => { setEditFat(v.replace(/\D/g, '')); setGoalsError(null) }} keyboardType="number-pad" style={s.modalInput} placeholder="70" placeholderTextColor={TEXT_DISABLED} />
                                </View>
                            </View>
                        </View>
                        <View style={s.modalActions}>
                            <Pressable disabled={updatingGoals} onPress={() => setEditGoalsModal(false)} style={s.modalCancelBtn}>
                                <Text style={s.modalCancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable disabled={updatingGoals} onPress={handleSaveGoals} style={({ pressed }) => [s.modalSaveBtn, pressed && { opacity: 0.85 }]}>
                                {updatingGoals ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.modalSaveBtnText}>Save Targets</Text>}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <AlertModal visible={signOutModal} title="Sign out" message="You will be signed out of your account."
                buttons={[{ text: 'Cancel', style: 'cancel', onPress: () => setSignOutModal(false) }, { text: 'Sign out', style: 'destructive', onPress: () => { setSignOutModal(false); handleSignOut() } }]}
                onDismiss={() => setSignOutModal(false)} />
            <AlertModal visible={!!errorModal} title="Error" message={errorModal ?? ''}
                buttons={[{ text: 'OK', onPress: () => setErrorModal(null) }]} onDismiss={() => setErrorModal(null)} />
        </ScrollView>
    )
}

function MacroRow({ icon, iconColor, label, value, divider }: {
    icon: string; iconColor: string; label: string; value: string; divider?: boolean
}) {
    return (
        <>
            <View style={s.macroRow}>
                <View style={[s.macroIconWrap, { backgroundColor: iconColor + '18' }]}>
                    <Ionicons name={icon as any} size={16} color={iconColor} />
                </View>
                <View style={s.macroInfo}>
                    <Text style={s.macroLabel}>{label}</Text>
                    <Text style={[s.macroValue, { color: iconColor }]}>{value}</Text>
                </View>
            </View>
            {divider && <View style={s.macroDivider} />}
        </>
    )
}

const s = StyleSheet.create({
    container: { paddingHorizontal: 20, gap: 14 },
    heroCard: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16 },
    avatarWrap: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE_CONTAINER_LOW, borderWidth: 2, borderColor: SURFACE_ELEVATED, marginBottom: 4 },
    avatarText: { fontSize: 26, fontWeight: '800', color: TEXT_PRIMARY },
    premiumBadge: { position: 'absolute', bottom: -1, right: -1, width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, borderWidth: 2.5, borderColor: SURFACE_ELEVATED, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.4 },
    streakRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    streakText: { fontSize: 13.5, fontWeight: '700', color: ENERGY_ORANGE },
    email: { fontSize: 12.5, color: TEXT_SECONDARY },

    weightCard: { padding: 16, gap: 12 },
    weightTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    weightTitle: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
    weightBody: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
    weightValue: { fontSize: 28, fontWeight: '800', color: TEXT_PRIMARY },
    weightDiff: { fontSize: 13, fontWeight: '600' },
    weightAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    weightAddText: { fontSize: 12.5, fontWeight: '600', color: ACCENT },

    planCard: { borderWidth: 1, paddingVertical: 12 },
    planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY },
    planTitle: { color: TEXT_PRIMARY, fontSize: 14.5, fontWeight: '700' },
    planSub: { color: TEXT_SECONDARY, fontSize: 12 },
    manageBtn: { borderWidth: 1, borderColor: ACCENT_BORDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    manageBtnText: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '600' },
    upgradeCard: { minHeight: 66, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
    upgradeTitle: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
    upgradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3, marginBottom: -4 },
    goalsCard: { padding: 0, overflow: 'hidden' },
    macroRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    macroIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    macroInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
    macroLabel: { fontSize: 14.5, color: TEXT_PRIMARY, fontWeight: '600' },
    macroValue: { fontSize: 14.5, fontWeight: '700' },
    macroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 60 },
    editGoalsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
    editGoalsBtnPressed: { backgroundColor: ACCENT_DIM },
    editGoalsBtnText: { color: TEXT_TERTIARY, fontSize: 13.5, fontWeight: '700' },
    sectionCard: { padding: 0, overflow: 'hidden' },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, backgroundColor: PRIMARY, borderRadius: 24, marginTop: 6 },
    signOutText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: { backgroundColor: SURFACE_ELEVATED, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
    modalHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: OUTLINE_VARIANT, marginBottom: 4 },
    modalTitle: { color: TEXT_PRIMARY, fontSize: 19, fontWeight: '800', textAlign: 'center' },
    modalSubtitle: { color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
    goalsErrorBox: { backgroundColor: 'rgba(186,26,26,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(186,26,26,0.2)', paddingHorizontal: 14, paddingVertical: 10 },
    goalsErrorText: { color: ERROR, fontSize: 13, textAlign: 'center' },
    modalForm: { gap: 14 },
    modalInputGroup: { gap: 6 },
    modalInputLabel: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase' },
    modalInput: { height: 48, backgroundColor: SURFACE_CONTAINER_LOW, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, color: TEXT_PRIMARY, fontSize: 15, fontWeight: '500' },
    autoSplitBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 4 },
    autoSplitBtnText: { color: TEXT_TERTIARY, fontSize: 12, fontWeight: '600' },
    macroInputsRow: { flexDirection: 'row', gap: 10 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
    modalCancelBtn: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: SURFACE_CONTAINER_LOW },
    modalCancelBtnText: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600' },
    modalSaveBtn: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: PRIMARY },
    modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
