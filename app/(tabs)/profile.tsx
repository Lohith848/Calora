import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
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
    ACCENT,
    ACCENT_BORDER,
    BG,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { demoUser } from '@/lib/mockData'
import { useProfile } from '@/hooks/useProfile'
import { useGoals, useUpdateGoals } from '@/hooks/useGoals'
import { useStreak } from '@/hooks/useStreaks'
import { TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { BORDER, SURFACE } from '@/lib/theme'

export default function ProfileScreen() {
    const insets = useSafeAreaInsets()
    const { isPremium, customerInfo } = useSubscription()
    const { data: profile } = useProfile()
    const { data: goals } = useGoals()
    const { data: streak = 0 } = useStreak()
    const updateGoalsMutation = useUpdateGoals()

    const [signOutModal, setSignOutModal] = useState(false)
    const [signingOut, setSigningOut] = useState(false)
    const [errorModal, setErrorModal] = useState<string | null>(null)

    // Edit goals modal states
    const [editGoalsModal, setEditGoalsModal] = useState(false)
    const [editCalories, setEditCalories] = useState('2000')
    const [editProtein, setEditProtein] = useState('130')
    const [editCarbs, setEditCarbs] = useState('220')
    const [editFat, setEditFat] = useState('70')
    const [updatingGoals, setUpdatingGoals] = useState(false)
    const [goalsError, setGoalsError] = useState<string | null>(null)

    const expiryMs = customerInfo?.entitlements.active['premium']?.expirationDate
    const expiryDate = expiryMs
        ? new Date(expiryMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : null

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
        if (isNaN(cal) || cal <= 0) {
            setGoalsError('Enter a valid calorie target first.')
            return
        }
        // Compute standard macro splits (25% Protein, 45% Carbs, 30% Fat)
        const p = Math.round((cal * 0.25) / 4)
        const c = Math.round((cal * 0.45) / 4)
        const f = Math.round((cal * 0.30) / 9)
        setEditProtein(String(p))
        setEditCarbs(String(c))
        setEditFat(String(f))
        setGoalsError(null)
    }

    async function handleSaveGoals() {
        setUpdatingGoals(true)
        setGoalsError(null)
        const cal = parseInt(editCalories, 10)
        const p = parseInt(editProtein, 10)
        const c = parseInt(editCarbs, 10)
        const f = parseInt(editFat, 10)

        if (isNaN(cal) || cal < 800 || cal > 8000) {
            setUpdatingGoals(false)
            setGoalsError('Calories must be between 800 and 8000 kcal.')
            return
        }
        if (isNaN(p) || p < 10 || p > 500) {
            setUpdatingGoals(false)
            setGoalsError('Protein must be between 10g and 500g.')
            return
        }
        if (isNaN(c) || c < 10 || c > 1000) {
            setUpdatingGoals(false)
            setGoalsError('Carbs must be between 10g and 1000g.')
            return
        }
        if (isNaN(f) || f < 5 || f > 300) {
            setUpdatingGoals(false)
            setGoalsError('Fat must be between 5g and 300g.')
            return
        }

        try {
            await updateGoalsMutation.mutateAsync({
                calories: cal,
                protein: p,
                carbs: c,
                fat: f,
            })
            setEditGoalsModal(false)
        } catch (err: any) {
            setGoalsError(err?.message ?? 'Failed to update targets.')
        } finally {
            setUpdatingGoals(false)
        }
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
            showsVerticalScrollIndicator={false}
        >
            <Card style={s.heroCard}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                <View style={s.avatarWrap}>
                    <Text style={s.avatarText}>{profile?.initials ?? demoUser.initials}</Text>
                    {isPremium && (
                        <View style={s.premiumDot}>
                            <Ionicons name="sparkles" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <Text style={s.name}>{profile?.fullName ?? demoUser.fullName}</Text>
                <Text style={s.streakText}>🔥 {streak} Day Streak</Text>
                <Text style={s.metaText}>{profile?.email ?? demoUser.email}</Text>
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
                        colors={[ACCENT, adjustBrightness(ACCENT, -18)]}
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

            <Text style={s.sectionTitle}>Nutritional Targets</Text>
            <Card compact style={s.goalsCard}>
                <View style={s.goalRow}>
                    <Ionicons name="flame" size={18} color="#f59e0b" style={s.goalIcon} />
                    <View style={s.goalInfo}>
                        <Text style={s.goalLabel}>Daily Calories</Text>
                        <Text style={s.goalValue}>{goals?.calories ?? 2000} kcal</Text>
                    </View>
                </View>
                <View style={s.goalRowDivider} />
                <View style={s.goalRow}>
                    <Ionicons name="fitness" size={18} color="#10b981" style={s.goalIcon} />
                    <View style={s.goalInfo}>
                        <Text style={s.goalLabel}>Protein</Text>
                        <Text style={s.goalValue}>{goals?.protein ?? 130}g</Text>
                    </View>
                </View>
                <View style={s.goalRowDivider} />
                <View style={s.goalRow}>
                    <Ionicons name="leaf" size={18} color="#3b82f6" style={s.goalIcon} />
                    <View style={s.goalInfo}>
                        <Text style={s.goalLabel}>Carbohydrates</Text>
                        <Text style={s.goalValue}>{goals?.carbs ?? 220}g</Text>
                    </View>
                </View>
                <View style={s.goalRowDivider} />
                <View style={s.goalRow}>
                    <Ionicons name="water" size={18} color="#ec4899" style={s.goalIcon} />
                    <View style={s.goalInfo}>
                        <Text style={s.goalLabel}>Fats</Text>
                        <Text style={s.goalValue}>{goals?.fat ?? 70}g</Text>
                    </View>
                </View>
                <View style={s.goalRowDivider} />
                <Pressable
                    onPress={openEditModal}
                    style={({ pressed }) => [s.editGoalsBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                >
                    <Ionicons name="create-outline" size={16} color={ACCENT} />
                    <Text style={s.editGoalsBtnText}>Adjust Targets</Text>
                </Pressable>
            </Card>

            <Text style={s.sectionTitle}>Account</Text>
            <Card compact style={s.sectionCard}>
                <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
                <SettingsRow icon="help-buoy-outline" label="Support" onPress={() => router.push('/support')} />
                <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
                <SettingsRow icon="shield-checkmark-outline" label="Terms of Service" onPress={() => router.push('/terms')} last={true} />
            </Card>

            <Pressable
                onPress={() => setSignOutModal(true)}
                disabled={signingOut}
                style={({ pressed }) => [s.signOutBtn, (pressed || signingOut) && { opacity: 0.72 }]}
            >
                <Ionicons name="log-out-outline" size={17} color="rgba(255,255,255,0.45)" />
                <Text style={s.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
            </Pressable>

            {/* Goals Edit Modal */}
            <Modal
                visible={editGoalsModal}
                transparent
                animationType="fade"
                onRequestClose={() => !updatingGoals && setEditGoalsModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={s.modalContainer}
                >
                    <View style={s.modalBackdrop} />
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => !updatingGoals && setEditGoalsModal(false)}
                    />
                    
                    <View style={s.modalSheet}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>Adjust Targets</Text>
                        <Text style={s.modalSubtitle}>Customize your daily calorie budget and macronutrient split goals.</Text>

                        {goalsError ? (
                            <View style={s.goalsErrorBox}>
                                <Text style={s.goalsErrorText}>{goalsError}</Text>
                            </View>
                        ) : null}

                        <View style={s.modalForm}>
                            <View style={s.modalInputGroup}>
                                <Text style={s.modalInputLabel}>Daily Calories (kcal)</Text>
                                <TextInput
                                    value={editCalories}
                                    onChangeText={(v) => { setEditCalories(v.replace(/\D/g, '')); setGoalsError(null) }}
                                    keyboardType="number-pad"
                                    style={s.modalInput}
                                    placeholder="2000"
                                    placeholderTextColor="rgba(255,255,255,0.18)"
                                />
                            </View>

                            <Pressable onPress={handleAutoSplit} style={s.autoSplitBtn}>
                                <Ionicons name="calculator-outline" size={14} color={ACCENT} />
                                <Text style={s.autoSplitBtnText}>Auto-split macros (25% P / 45% C / 30% F)</Text>
                            </Pressable>

                            <View style={s.macroInputsRow}>
                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={s.modalInputLabel}>Protein (g)</Text>
                                    <TextInput
                                        value={editProtein}
                                        onChangeText={(v) => { setEditProtein(v.replace(/\D/g, '')); setGoalsError(null) }}
                                        keyboardType="number-pad"
                                        style={s.modalInput}
                                        placeholder="130"
                                        placeholderTextColor="rgba(255,255,255,0.18)"
                                    />
                                </View>

                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={s.modalInputLabel}>Carbs (g)</Text>
                                    <TextInput
                                        value={editCarbs}
                                        onChangeText={(v) => { setEditCarbs(v.replace(/\D/g, '')); setGoalsError(null) }}
                                        keyboardType="number-pad"
                                        style={s.modalInput}
                                        placeholder="220"
                                        placeholderTextColor="rgba(255,255,255,0.18)"
                                    />
                                </View>

                                <View style={[s.modalInputGroup, { flex: 1 }]}>
                                    <Text style={s.modalInputLabel}>Fat (g)</Text>
                                    <TextInput
                                        value={editFat}
                                        onChangeText={(v) => { setEditFat(v.replace(/\D/g, '')); setGoalsError(null) }}
                                        keyboardType="number-pad"
                                        style={s.modalInput}
                                        placeholder="70"
                                        placeholderTextColor="rgba(255,255,255,0.18)"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={s.modalActions}>
                            <Pressable
                                disabled={updatingGoals}
                                onPress={() => setEditGoalsModal(false)}
                                style={s.modalCancelBtn}
                            >
                                <Text style={s.modalCancelBtnText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                disabled={updatingGoals}
                                onPress={handleSaveGoals}
                                style={({ pressed }) => [s.modalSaveBtn, pressed && { opacity: 0.85 }]}
                            >
                                <LinearGradient
                                    colors={[ACCENT, adjustBrightness(ACCENT, -20)]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={s.modalSaveBtnGradient}
                                >
                                    {updatingGoals ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={s.modalSaveBtnText}>Save Targets</Text>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <AlertModal
                visible={signOutModal}
                title="Sign out"
                message="You will be signed out of your account."
                buttons={[
                    { text: 'Cancel', style: 'cancel', onPress: () => setSignOutModal(false) },
                    { text: 'Sign out', style: 'destructive', onPress: () => { setSignOutModal(false); handleSignOut() } },
                ]}
                onDismiss={() => setSignOutModal(false)}
            />

            <AlertModal
                visible={!!errorModal}
                title="Error"
                message={errorModal ?? ''}
                buttons={[{ text: 'OK', onPress: () => setErrorModal(null) }]}
                onDismiss={() => setErrorModal(null)}
            />
        </ScrollView>
    )
}

const s = StyleSheet.create({
    container: { paddingHorizontal: 20, gap: 14 },
    heroCard: {
        overflow: 'hidden',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 16,
    },
    avatarWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginBottom: 4,
    },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
    premiumDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 999,
        backgroundColor: ACCENT,
        borderWidth: 2,
        borderColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY, letterSpacing: -0.4 },
    streakText: { fontSize: 13.5, fontWeight: '700', color: '#f59e0b', marginTop: 1 },
    metaText: { fontSize: 12.5, color: TEXT_SECONDARY, opacity: 0.8 },
    planCard: {
        borderWidth: 1,
        paddingVertical: 12,
    },
    planTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planBadge: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ACCENT,
    },
    planTitle: { color: ACCENT, fontSize: 14.5, fontWeight: '700' },
    planSub: { color: TEXT_SECONDARY, fontSize: 12 },
    manageBtn: {
        borderWidth: 1,
        borderColor: ACCENT_BORDER,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    manageBtnText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
    upgradeCard: {
        minHeight: 66,
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
    },
    upgradeTitle: { color: '#fff', fontSize: 14.5, fontWeight: '700' },
    upgradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: TEXT_TERTIARY,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginTop: 3,
        marginBottom: -4,
    },
    goalsCard: { padding: 0, overflow: 'hidden' },
    goalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    goalIcon: {
        width: 24,
        textAlign: 'center',
    },
    goalInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    goalLabel: {
        fontSize: 14.5,
        color: TEXT_PRIMARY,
        fontWeight: '600',
    },
    goalValue: {
        fontSize: 14.5,
        color: TEXT_SECONDARY,
        fontWeight: '700',
    },
    goalRowDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: BORDER,
    },
    editGoalsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    editGoalsBtnText: {
        color: ACCENT,
        fontSize: 13.5,
        fontWeight: '700',
    },
    sectionCard: { padding: 0, overflow: 'hidden' },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 10,
    },
    signOutText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500' },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    modalSheet: {
        backgroundColor: SURFACE,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: BORDER,
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 32,
        gap: 16,
    },
    modalHandle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginBottom: 4,
    },
    modalTitle: {
        color: TEXT_PRIMARY,
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
    },
    modalSubtitle: {
        color: TEXT_SECONDARY,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    goalsErrorBox: {
        backgroundColor: 'rgba(248,113,113,0.08)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    goalsErrorText: {
        color: '#f87171',
        fontSize: 13,
        textAlign: 'center',
    },
    modalForm: {
        gap: 14,
    },
    modalInputGroup: {
        gap: 6,
    },
    modalInputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: TEXT_TERTIARY,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    modalInput: {
        height: 48,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        paddingHorizontal: 14,
        color: '#fff',
        fontSize: 15,
    },
    autoSplitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 4,
    },
    autoSplitBtnText: {
        color: ACCENT,
        fontSize: 12,
        fontWeight: '600',
    },
    macroInputsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    modalCancelBtn: {
        flex: 1,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    modalCancelBtnText: {
        color: TEXT_SECONDARY,
        fontSize: 15,
        fontWeight: '600',
    },
    modalSaveBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        overflow: 'hidden',
    },
    modalSaveBtnGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
})

