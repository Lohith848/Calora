import { useEffect, useRef, useState } from 'react'
import {
  View, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Linking, Platform, AppState, AppStateStatus,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { AlertModal } from '@/components/ui/AppModal'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { PurchasesPackage } from 'react-native-purchases'
import Purchases from 'react-native-purchases'
import { track } from '@/lib/analytics'
import * as Haptics from 'expo-haptics'
import {
  SURFACE_ELEVATED, SURFACE_CONTAINER_LOW, ON_SURFACE, ON_SURFACE_VARIANT,
  PRIMARY, ACCENT, ACCENT_DIM, ACCENT_BORDER, SHADOW_SM, SHADOW_LG,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, TEXT_DISABLED, BG, BORDER,
  PROTEIN_GREEN,
} from '@/lib/theme'

interface Tier {
  id: 'free' | 'medium' | 'premium'
  name: string
  price: string
  per?: string
  features: { icon: string; label: string }[]
  highlighted?: boolean
  badge?: string
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    per: 'forever',
    features: [
      { icon: 'camera-outline', label: '5 AI scans per day' },
      { icon: 'restaurant-outline', label: 'Basic meal logging' },
      { icon: 'bar-chart-outline', label: 'Daily nutrition summary' },
      { icon: 'flame-outline', label: 'Streak tracking' },
    ],
  },
  {
    id: 'medium',
    name: 'Medium',
    price: '$4.99',
    per: '/month',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { icon: 'infinite-outline', label: 'Unlimited AI scans' },
      { icon: 'restaurant-outline', label: 'Advanced meal logging' },
      { icon: 'stats-chart-outline', label: 'Weekly analytics & trends' },
      { icon: 'flame-outline', label: 'Streak tracking & insights' },
      { icon: 'scale-outline', label: 'Weight tracking & history' },
      { icon: 'notifications-outline', label: 'Goal notifications' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    per: '/month',
    badge: 'Best Value',
    features: [
      { icon: 'infinite-outline', label: 'Unlimited AI scans' },
      { icon: 'restaurant-outline', label: 'Premium meal logging' },
      { icon: 'stats-chart-outline', label: 'Advanced analytics & reports' },
      { icon: 'flame-outline', label: 'Streak tracking & insights' },
      { icon: 'scale-outline', label: 'Weight tracking & history' },
      { icon: 'notifications-outline', label: 'Goal notifications' },
      { icon: 'mail-outline', label: 'Weekly email reports' },
      { icon: 'headset-outline', label: 'Priority support (24h)' },
      { icon: 'star-outline', label: 'Early access to new features' },
    ],
  },
]

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets()
  const { isPremium, isLoading, offerings, purchase, restore, refresh, customerInfo } = useSubscription()

  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [waitingForRedeem, setWaitingForRedeem] = useState(false)
  const waitingRef = useRef(false)
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'active' && waitingRef.current) {
        waitingRef.current = false
        setWaitingForRedeem(false)
        const result = await restore()
        if (result.success) await refresh()
      }
    })
    return () => sub.remove()
  }, [restore, refresh])

  useEffect(() => { track('upgrade_page_viewed') }, [])

  // Map RevenueCat packages to tier identifiers
  const packages = offerings?.current?.availablePackages ?? []

  const getPackageByIdentifier = (id: string): PurchasesPackage | undefined => {
    return packages.find(p =>
      id === 'medium'
        ? (p.identifier.toLowerCase().includes('month') && !p.identifier.toLowerCase().includes('year'))
        : p.identifier.toLowerCase().includes('year') || p.identifier.toLowerCase().includes('premium')
    )
  }

  const selectedPkg = selectedIdentifier ? getPackageByIdentifier(selectedIdentifier) : packages[0] ?? null

  const handleSelectTier = (tierId: string) => {
    if (tierId === 'free') {
      router.back()
      return
    }
    setSelectedIdentifier(tierId)
  }

  async function handlePurchase() {
    if (!selectedPkg || purchasing) return
    track('upgrade_cta_tapped', { package: selectedPkg.identifier })
    setPurchasing(true)
    try {
      const result = await purchase(selectedPkg)
      if (result.success) {
        track('purchase_success', { package: selectedPkg.identifier })
        await refresh()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      } else if (!result.cancelled) {
        setModal({ title: 'Purchase failed', message: result.error ?? 'Something went wrong. Please try again.' })
      }
    } finally { setPurchasing(false) }
  }

  async function handleRestore() {
    if (restoring) return
    track('restore_purchases_tapped')
    setRestoring(true)
    try {
      const result = await restore()
      if (result.success) {
        await refresh()
        setModal({
          title: result.success && isPremium ? 'Purchases restored' : 'Nothing to restore',
          message: result.success && isPremium ? 'Your subscription has been restored.' : 'No active subscription found for this account.',
        })
      } else {
        setModal({ title: 'Restore failed', message: result.error ?? 'Something went wrong.' })
      }
    } finally { setRestoring(false) }
  }

  const getTierPrice = (tierId: string): string => {
    const pkg = getPackageByIdentifier(tierId)
    return pkg?.product.priceString ?? (tierId === 'medium' ? '$4.99' : '$9.99')
  }

  const expiryMs = customerInfo?.entitlements.active['premium']?.expirationDate
  const expiryDate = expiryMs
    ? new Date(expiryMs).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const willRenew = customerInfo?.entitlements.active['premium']?.willRenew ?? false

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={ON_SURFACE_VARIANT} />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
      >
        <View style={s.header}>
          <View style={[s.sparkleWrap, { backgroundColor: ACCENT_DIM }]}>
            <Ionicons name="sparkles" size={22} color={PRIMARY} />
          </View>
          <Text style={[s.eyebrow, { color: PRIMARY }]}>CALORA</Text>
          <Text style={s.title}>Choose your plan</Text>
          <Text style={s.subtitle}>Track smarter with AI-powered nutrition insights.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={TEXT_TERTIARY} style={{ marginVertical: 48 }} />
        ) : isPremium ? (
          <View style={[s.proActiveCard, { borderColor: ACCENT_BORDER }]}>
            <View style={s.proActiveTop}>
              <View style={[s.proBadge, { backgroundColor: PRIMARY }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <View>
                <Text style={s.proActiveTitle}>You're on Premium</Text>
                {expiryDate && (
                  <Text style={s.proActiveSub}>
                    {willRenew ? `Renews ${expiryDate}` : `Expires ${expiryDate}`}
                  </Text>
                )}
              </View>
            </View>
            <View style={s.featureGrid}>
              {TIERS[2].features.map((f) => (
                <View key={f.label} style={s.featureItem}>
                  <View style={[s.featureIcon, { backgroundColor: ACCENT_DIM }]}>
                    <Ionicons name={f.icon as any} size={13} color={PRIMARY} />
                  </View>
                  <Text style={s.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions'
              )}
              style={s.manageBtn}
            >
              <Text style={s.manageBtnText}>Manage or cancel subscription →</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Tier Cards */}
            <View style={s.tiersContainer}>
              {TIERS.map((tier) => {
                const isSelected = (selectedIdentifier ?? 'free') === tier.id
                const tierPkg = tier.id !== 'free' ? getPackageByIdentifier(tier.id) : null
                const displayPrice = tier.id === 'free' ? '$0'
                  : tierPkg?.product.priceString ?? getTierPrice(tier.id)

                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => handleSelectTier(tier.id)}
                    style={[
                      s.tierCard,
                      isSelected && tier.id !== 'free' && s.tierCardSelected,
                      tier.highlighted && s.tierHighlighted,
                    ]}
                  >
                    {tier.badge && (
                      <View style={[s.tierBadge, { backgroundColor: tier.highlighted ? PRIMARY : ACCENT_DIM }]}>
                        <Text style={[s.tierBadgeText, { color: tier.highlighted ? '#fff' : PRIMARY }]}>{tier.badge}</Text>
                      </View>
                    )}
                    <Text style={s.tierName}>{tier.name}</Text>
                    <View style={s.tierPriceRow}>
                      <Text style={s.tierPrice}>{displayPrice}</Text>
                      {tier.per && <Text style={s.tierPer}>{tier.per}</Text>}
                    </View>
                    <View style={s.tierFeatures}>
                      {tier.features.map((f) => (
                        <View key={f.label} style={s.tierFeatureItem}>
                          <Ionicons name="checkmark-circle" size={14} color={tier.id === 'free' ? TEXT_TERTIARY : PROTEIN_GREEN} />
                          <Text style={[s.tierFeatureText, tier.id === 'free' && { color: TEXT_TERTIARY }]}>{f.label}</Text>
                        </View>
                      ))}
                    </View>
                    {tier.id === 'free' && (
                      <View style={s.currentPlanBadge}>
                        <Text style={s.currentPlanText}>Current Plan</Text>
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </View>

            {/* CTA */}
            {selectedIdentifier && selectedIdentifier !== 'free' && (
              <View style={[s.ctaGlow, SHADOW_LG]}>
                <Pressable onPress={handlePurchase} disabled={purchasing || !selectedPkg} style={[s.ctaWrap, { backgroundColor: PRIMARY }]}>
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={s.cta}>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                      <Text style={s.ctaText}>Subscribe to {TIERS.find(t => t.id === selectedIdentifier)?.name}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            <View style={s.footerLinks}>
              <Pressable onPress={handleRestore} disabled={restoring || waitingForRedeem}>
                {restoring ? <ActivityIndicator size="small" color={TEXT_TERTIARY} /> : <Text style={s.footerLink}>Restore purchases</Text>}
              </Pressable>
              <Text style={s.footerDot}>·</Text>
              <Pressable onPress={() => {
                waitingRef.current = true
                setWaitingForRedeem(true)
                Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/redeem' : 'https://play.google.com/redeem')
              }} disabled={restoring || waitingForRedeem}>
                {waitingForRedeem ? <ActivityIndicator size="small" color={TEXT_TERTIARY} /> : <Text style={s.footerLink}>Redeem code</Text>}
              </Pressable>
            </View>

            <Text style={s.legal}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period.
              Manage in your account settings.
            </Text>
          </>
        )}
      </ScrollView>

      <AlertModal
        visible={!!modal}
        title={modal?.title ?? ''}
        message={modal?.message}
        buttons={[{ text: 'OK', onPress: () => setModal(null) }]}
        onDismiss={() => setModal(null)}
      />
    </View>
  )
}

const RADIUS = 20
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backBtn: { padding: 16, alignSelf: 'flex-start' },
  scroll: { paddingHorizontal: 16 },
  header: { paddingTop: 4, paddingBottom: 20, gap: 8, alignItems: 'center' },
  sparkleWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2.5 },
  title: { color: ON_SURFACE, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  proActiveCard: { borderRadius: RADIUS, borderWidth: 1, backgroundColor: SURFACE_CONTAINER_LOW, padding: 20, gap: 16 },
  proActiveTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  proActiveTitle: { color: ON_SURFACE, fontSize: 16, fontWeight: '700' },
  proActiveSub: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  manageBtn: { alignItems: 'center', paddingTop: 4 },
  manageBtnText: { color: TEXT_TERTIARY, fontSize: 12, textDecorationLine: 'underline' },
  featureGrid: { gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { color: ON_SURFACE_VARIANT, fontSize: 14, flex: 1, lineHeight: 20 },

  tiersContainer: { gap: 12, marginBottom: 16 },
  tierCard: {
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE_ELEVATED, padding: 16, overflow: 'hidden',
  },
  tierCardSelected: { borderColor: PRIMARY, backgroundColor: SURFACE_CONTAINER_LOW },
  tierHighlighted: { borderColor: ACCENT_BORDER },
  tierBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  tierBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tierName: { fontSize: 18, fontWeight: '800', color: ON_SURFACE, marginBottom: 4 },
  tierPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 14 },
  tierPrice: { fontSize: 24, fontWeight: '800', color: ON_SURFACE },
  tierPer: { fontSize: 13, color: TEXT_TERTIARY, fontWeight: '500' },
  tierFeatures: { gap: 8 },
  tierFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierFeatureText: { color: ON_SURFACE_VARIANT, fontSize: 13, flex: 1 },
  currentPlanBadge: { backgroundColor: SURFACE_CONTAINER_LOW, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 12 },
  currentPlanText: { color: TEXT_TERTIARY, fontSize: 11, fontWeight: '600' },

  ctaGlow: { borderRadius: 16, marginBottom: 12 },
  ctaWrap: { borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
  footerLink: { color: TEXT_TERTIARY, fontSize: 13, textDecorationLine: 'underline' },
  footerDot: { color: BORDER, fontSize: 13 },
  legal: { color: TEXT_DISABLED, fontSize: 11, textAlign: 'center', lineHeight: 18 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
