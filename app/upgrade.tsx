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
} from '@/lib/theme'

const PRO_FEATURES = [
  { icon: 'infinite-outline',         label: 'Unlimited access to all features' },
  { icon: 'rocket-outline',           label: 'Priority processing & speed' },
  { icon: 'shield-checkmark-outline', label: 'Ad-free experience' },
  { icon: 'headset-outline',          label: 'Priority support (24h response)' },
  { icon: 'star-outline',             label: 'Early access to new features' },
]

function FeatureItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.featureItem}>
      <View style={[s.featureIcon, { backgroundColor: ACCENT_DIM }]}>
        <Ionicons name={icon as any} size={14} color={PRIMARY} />
      </View>
      <Text style={s.featureText}>{label}</Text>
    </View>
  )
}

function PackageCard({
  pkg, isSelected, onSelect, savingsPct,
}: {
  pkg: PurchasesPackage; isSelected: boolean; onSelect: () => void; savingsPct: number | null
}) {
  const product  = pkg.product
  const isYearly = pkg.packageType === 'ANNUAL' || pkg.identifier.toLowerCase().includes('year')
  const priceStr = product.priceString ?? ''

  let perMonthStr: string | null = null
  if (isYearly && product.price) {
    const perMonth = product.price / 12
    perMonthStr = new Intl.NumberFormat(undefined, {
      style: 'currency', currency: product.currencyCode ?? 'USD', maximumFractionDigits: 2,
    }).format(perMonth) + '/mo'
  }

  return (
    <Pressable
      onPress={onSelect}
      style={[
        s.packageCard,
        isSelected && s.packageCardSelected,
      ]}
    >
      {isYearly && savingsPct && (
        <View style={[s.bestValueBadge, { backgroundColor: ACCENT_DIM }]}>
          <Text style={[s.bestValueText, { color: PRIMARY }]}>
            Best Value · {savingsPct}% off
          </Text>
        </View>
      )}
      <View style={s.packageRow}>
        <View style={[s.radio, isSelected && { borderColor: PRIMARY }]}>
          {isSelected && <View style={[s.radioInner, { backgroundColor: PRIMARY }]} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.packageLabel}>{isYearly ? 'Yearly' : 'Monthly'}</Text>
          {isYearly && perMonthStr && (
            <Text style={s.packageNote}>{perMonthStr} · billed annually</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.packagePrice}>{priceStr}</Text>
          <Text style={s.packagePer}>{isYearly ? '/ year' : '/ month'}</Text>
        </View>
      </View>
    </Pressable>
  )
}

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets()
  const { isPremium, isLoading, offerings, purchase, restore, refresh, customerInfo } = useSubscription()

  const [selectedPkg,       setSelectedPkg]       = useState<PurchasesPackage | null>(null)
  const [purchasing,        setPurchasing]         = useState(false)
  const [restoring,         setRestoring]          = useState(false)
  const [waitingForRedeem,  setWaitingForRedeem]   = useState(false)
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

  useEffect(() => {
    track('upgrade_page_viewed')
  }, [])

  const packages = offerings?.current?.availablePackages ?? []

  const defaultPkg = selectedPkg
    ?? packages.find(p => p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('year'))
    ?? packages[0]
    ?? null

  const monthlyPkg = packages.find(p => p.packageType !== 'ANNUAL' && !p.identifier.toLowerCase().includes('year'))
  const yearlyPkg  = packages.find(p => p.packageType === 'ANNUAL' || p.identifier.toLowerCase().includes('year'))
  const savingsPct = (() => {
    const monthly = monthlyPkg?.product.price
    const yearly  = yearlyPkg?.product.price
    if (!monthly || !yearly || monthly <= 0) return null
    return Math.round((1 - yearly / (monthly * 12)) * 100)
  })()

  async function handlePurchase() {
    if (!defaultPkg || purchasing) return
    track('upgrade_cta_tapped', { package: defaultPkg.identifier })
    setPurchasing(true)
    try {
      const result = await purchase(defaultPkg)
      if (result.success) {
        track('purchase_success', { package: defaultPkg.identifier })
        await refresh()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      } else if (!result.cancelled) {
        setModal({ title: 'Purchase failed', message: result.error ?? 'Something went wrong. Please try again.' })
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    if (restoring) return
    track('restore_purchases_tapped')
    setRestoring(true)
    try {
      const result = await restore()
      if (result.success) {
        await refresh()
        if (isPremium) {
          setModal({ title: 'Purchases restored', message: 'Your subscription has been restored.' })
        } else {
          setModal({ title: 'Nothing to restore', message: 'No active subscription found for this account.' })
        }
      } else {
        setModal({ title: 'Restore failed', message: result.error ?? 'Something went wrong. Please try again.' })
      }
    } finally {
      setRestoring(false)
    }
  }

  async function handleRedeemCode() {
    track('redeem_code_tapped')
    if (Platform.OS === 'ios') {
      try { await Purchases.presentCodeRedemptionSheet() }
      catch { Linking.openURL('https://apps.apple.com/redeem') }
    } else {
      waitingRef.current = true
      setWaitingForRedeem(true)
      const canUseMarket = await Linking.canOpenURL('market://redeem')
      Linking.openURL(canUseMarket ? 'market://redeem' : 'https://play.google.com/redeem')
    }
  }

  const expiryMs  = customerInfo?.entitlements.active['premium']?.expirationDate
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
          <Text style={[s.eyebrow, { color: PRIMARY }]}>PREMIUM</Text>
          <Text style={s.title}>Unlock everything</Text>
          <Text style={s.subtitle}>Get full access to all pro features.</Text>
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
                <Text style={s.proActiveTitle}>You're on Pro</Text>
                {expiryDate && (
                  <Text style={s.proActiveSub}>
                    {willRenew ? `Renews ${expiryDate}` : `Expires ${expiryDate}`}
                  </Text>
                )}
              </View>
            </View>
            <View style={s.featureGrid}>
              {PRO_FEATURES.map((f) => <FeatureItem key={f.label} icon={f.icon} label={f.label} />)}
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
            <View style={[s.proCard, { borderColor: ACCENT_BORDER }]}>
              <View style={s.proCardInner}>
                <View style={[s.proPill, { backgroundColor: PRIMARY }]}>
                  <Ionicons name="sparkles" size={10} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={s.proPillText}>PRO</Text>
                </View>
                <View style={s.featureGrid}>
                  {PRO_FEATURES.map((f) => <FeatureItem key={f.label} icon={f.icon} label={f.label} />)}
                </View>
              </View>
            </View>

            {packages.length > 0 ? (
              <View style={s.packages}>
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.identifier}
                    pkg={pkg}
                    isSelected={(selectedPkg ?? defaultPkg)?.identifier === pkg.identifier}
                    onSelect={() => setSelectedPkg(pkg)}
                    savingsPct={savingsPct}
                  />
                ))}
              </View>
            ) : (
              <View style={s.unavailable}>
                <Text style={{ color: TEXT_TERTIARY, fontSize: 13, textAlign: 'center' }}>
                  Subscription plans unavailable right now. Please try again later.
                </Text>
              </View>
            )}

            {packages.length > 0 && (
              <View style={[s.ctaGlow, SHADOW_LG]}>
                <Pressable onPress={handlePurchase} disabled={purchasing || !defaultPkg} style={[s.ctaWrap, { backgroundColor: PRIMARY }]}>
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={s.cta}>
                      <Ionicons name="sparkles" size={14} color="#fff" />
                      <Text style={s.ctaText}>Unlock Pro</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            <View style={s.freeRow}>
              <View>
                <Text style={s.freeTierText}>Free</Text>
                <Text style={s.freeDescText}>Limited access</Text>
              </View>
              <View style={s.freeBadge}>
                <Text style={s.freeBadgeText}>Current plan</Text>
              </View>
            </View>

            <View style={s.footerLinks}>
              <Pressable onPress={handleRestore} disabled={restoring || waitingForRedeem}>
                {restoring
                  ? <ActivityIndicator size="small" color={TEXT_TERTIARY} />
                  : <Text style={s.footerLink}>Restore purchases</Text>
                }
              </Pressable>
              <Text style={s.footerDot}>·</Text>
              <Pressable onPress={handleRedeemCode} disabled={restoring || waitingForRedeem}>
                {waitingForRedeem
                  ? <ActivityIndicator size="small" color={TEXT_TERTIARY} />
                  : <Text style={s.footerLink}>Redeem promo code</Text>
                }
              </Pressable>
            </View>

            <Text style={s.legal}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of
              the current period. Manage in your account settings.
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
  backBtn:   { padding: 16, alignSelf: 'flex-start' },
  scroll:    { paddingHorizontal: 16 },

  header:     { paddingTop: 4, paddingBottom: 20, gap: 8, alignItems: 'center' },
  sparkleWrap:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow:    { fontSize: 11, fontWeight: '700', letterSpacing: 2.5 },
  title:      { color: ON_SURFACE, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle:   { color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  proActiveCard: {
    borderRadius: RADIUS, borderWidth: 1,
    backgroundColor: SURFACE_CONTAINER_LOW, padding: 20, gap: 16,
  },
  proActiveTop:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proBadge:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  proActiveTitle:{ color: ON_SURFACE, fontSize: 16, fontWeight: '700' },
  proActiveSub:  { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  manageBtn:     { alignItems: 'center', paddingTop: 4 },
  manageBtnText: { color: TEXT_TERTIARY, fontSize: 12, textDecorationLine: 'underline' },

  proCard:      { borderRadius: RADIUS + 1.5, padding: 1.5, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  proCardInner: { backgroundColor: SURFACE_ELEVATED, borderRadius: RADIUS, padding: 20 },
  proPill:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 16 },
  proPillText:  { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  featureGrid:  { gap: 12 },
  featureItem:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon:  { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText:  { color: ON_SURFACE_VARIANT, fontSize: 14, flex: 1, lineHeight: 20 },

  packages:     { gap: 10, marginBottom: 16 },
  packageCard:  {
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE_ELEVATED, padding: 16, overflow: 'hidden', ...SHADOW_SM,
  },
  packageCardSelected: { backgroundColor: SURFACE_CONTAINER_LOW },
  bestValueBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  bestValueText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  packageRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioInner:   { width: 10, height: 10, borderRadius: 5 },
  packageLabel: { color: ON_SURFACE, fontSize: 15, fontWeight: '700' },
  packageNote:  { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  packagePrice: { color: ON_SURFACE, fontSize: 17, fontWeight: '800' },
  packagePer:   { color: TEXT_TERTIARY, fontSize: 11, textAlign: 'right' },

  unavailable: { borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: 'center', marginBottom: 16, backgroundColor: SURFACE_ELEVATED },

  ctaGlow:  { borderRadius: 16, marginBottom: 12 },
  ctaWrap:  { borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  cta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  freeRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SURFACE_ELEVATED, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  freeTierText: { color: ON_SURFACE, fontSize: 14, fontWeight: '600' },
  freeDescText: { color: TEXT_TERTIARY, fontSize: 12, marginTop: 2 },
  freeBadge:    { backgroundColor: SURFACE_CONTAINER_LOW, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  freeBadgeText:{ color: TEXT_TERTIARY, fontSize: 11, fontWeight: '600' },

  footerLinks:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
  footerLink:   { color: TEXT_TERTIARY, fontSize: 13, textDecorationLine: 'underline' },
  footerDot:    { color: BORDER, fontSize: 13 },

  legal: { color: TEXT_DISABLED, fontSize: 11, textAlign: 'center', lineHeight: 18 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
