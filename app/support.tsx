import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Linking } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
  BG,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  SURFACE_ELEVATED,
  ON_SURFACE_VARIANT,
  ACCENT,
  ACCENT_DIM,
  PRIMARY,
  SHADOW_SM,
  SURFACE_CONTAINER_LOW,
} from '@/lib/theme'
import { APP_SUPPORT_EMAIL, APP_DOCS_URL } from '@/lib/constants'

const supportFaq = [
  {
    id: 'faq-1',
    question: 'How do I scan a meal?',
    answer: 'Tap the "Scan Meal" button on the Home page or navigate to the Scan tab. Take a photo or choose one from your gallery. Gemini AI will analyze the image and estimate calories and macronutrients.',
  },
  {
    id: 'faq-2',
    question: 'How accurate is the AI analysis?',
    answer: 'Calora uses Google Gemini AI for nutritional estimation. Accuracy depends on photo quality, portion visibility, and food complexity. Always review and adjust the AI estimates before saving. Nutritional values are approximations.',
  },
  {
    id: 'faq-3',
    question: 'How does the subscription work?',
    answer: 'Calora offers three tiers: Free (limited scans), Medium (unlimited scans + analytics), and Premium (all features + weekly reports + priority support). Subscriptions auto-renew through the App Store or Google Play.',
  },
  {
    id: 'faq-4',
    question: 'What happens to my data if I cancel?',
    answer: 'Your data remains accessible on the Free tier. If you cancel a paid subscription, premium features will be locked at the end of your billing period, but your logged meals and history are preserved.',
  },
  {
    id: 'faq-5',
    question: 'How do I reset my streak?',
    answer: 'Streaks are calculated automatically based on consecutive days with logged meals. If you miss a day, your streak resets to zero. You cannot manually reset or modify streak data.',
  },
  {
    id: 'faq-6',
    question: 'Is my weight data secure?',
    answer: 'Yes. All data is stored in Supabase with row-level security. Only you can access your weight logs. Data is encrypted in transit and at rest.',
  },
  {
    id: 'faq-7',
    question: 'How do I delete my account?',
    answer: 'Contact support@calora.app to request account deletion. We will process your request within 7 days and permanently delete your data.',
  },
  {
    id: 'faq-8',
    question: 'Can I export my nutrition data?',
    answer: 'Data export is available for Premium subscribers. Contact support@calora.app to request a CSV export of your meal logs.',
  },
]

export default function SupportScreen() {
  const insets = useSafeAreaInsets()
  const [openId, setOpenId] = useState<string | null>(supportFaq[0]?.id ?? null)

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={ON_SURFACE_VARIANT} />
        </Pressable>
        <Text style={s.headerTitle}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={s.heroCard}>
          <View style={s.heroIconWrap}>
            <Ionicons name="headset" size={24} color={PRIMARY} />
          </View>
          <Text style={s.heroTitle}>How can we help?</Text>
          <Text style={s.heroSub}>
            Browse frequently asked questions below or contact our support team directly.
          </Text>

          <View style={s.contactRow}>
            <Pressable onPress={() => Linking.openURL(`mailto:${APP_SUPPORT_EMAIL}`)} style={s.contactBtn}>
              <Ionicons name="mail-outline" size={16} color={ACCENT} />
              <Text style={s.contactText}>{APP_SUPPORT_EMAIL}</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(APP_DOCS_URL)} style={s.contactBtn}>
              <Ionicons name="book-outline" size={16} color={ACCENT} />
              <Text style={s.contactText}>Documentation</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
        <Card compact style={s.faqCard}>
          {supportFaq.map((item, index) => {
            const open = openId === item.id
            return (
              <Pressable
                key={item.id}
                onPress={() => setOpenId(open ? null : item.id)}
                style={[s.faqRow, index < supportFaq.length - 1 && s.faqDivider]}
              >
                <View style={s.faqTop}>
                  <Text style={s.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={TEXT_TERTIARY}
                  />
                </View>
                {open && <Text style={s.faqAnswer}>{item.answer}</Text>}
              </Pressable>
            )
          })}
        </Card>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
  body: { padding: 20, gap: 12 },
  heroCard: { gap: 7, alignItems: 'center', paddingVertical: 16 },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: ACCENT_DIM, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 17, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center' },
  heroSub: { fontSize: 13, lineHeight: 19, color: TEXT_SECONDARY, textAlign: 'center', paddingHorizontal: 10 },
  contactRow: { marginTop: 6, gap: 8, width: '100%' },
  contactBtn: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 10,
    backgroundColor: SURFACE_ELEVATED,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  contactText: { fontSize: 12.5, color: TEXT_PRIMARY },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY,
    letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4,
  },
  faqCard: { padding: 0, overflow: 'hidden' },
  faqRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  faqDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  faqTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  faqQuestion: { flex: 1, color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  faqAnswer: { color: TEXT_SECONDARY, fontSize: 12.5, lineHeight: 18, paddingRight: 16 },
})
