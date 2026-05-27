import { ScrollView, StyleSheet, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ON_SURFACE_VARIANT, BORDER } from '@/lib/theme'

export default function PrivacyScreen() {
    const insets = useSafeAreaInsets()

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="chevron-back" size={24} color={ON_SURFACE_VARIANT} />
                </Pressable>
                <Text style={s.title}>Privacy Policy</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                <Text style={s.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

                <Text style={s.heading}>1. Information We Collect</Text>
                <Text style={s.paragraph}>
                    Calora collects information you provide when creating an account and using our service, including:
                    {'\n'}• Email address and display name
                    {'\n'}• Meal photos and nutritional data you log
                    {'\n'}• Weight measurements you choose to record
                    {'\n'}• Subscription and payment information (processed securely through RevenueCat)
                    {'\n'}• Device information for push notification delivery
                </Text>

                <Text style={s.heading}>2. How We Use Your Data</Text>
                <Text style={s.paragraph}>
                    Your data is used exclusively to provide and improve the Calora service:
                    {'\n'}• Analyze meal photos using AI to estimate nutritional content
                    {'\n'}• Track your daily nutrition and weight progress over time
                    {'\n'}• Send you streak reminders and goal achievement notifications
                    {'\n'}• Generate weekly email summaries (if enabled)
                    {'\n'}• Process subscription payments and manage entitlements
                </Text>

                <Text style={s.heading}>3. AI Photo Analysis</Text>
                <Text style={s.paragraph}>
                    Meal photos are sent to Google's Gemini API for nutritional analysis. Images are processed in real-time
                    and are not stored by the AI provider. Calora stores meal photos only if you choose to save them as
                    part of your meal log.
                </Text>

                <Text style={s.heading}>4. Data Storage & Security</Text>
                <Text style={s.paragraph}>
                    Your data is stored securely in Supabase (PostgreSQL) with row-level security ensuring you can only
                    access your own data. We use industry-standard encryption for data in transit (TLS) and at rest.
                    Authentication is handled through Supabase Auth with PKCE flow for secure session management.
                </Text>

                <Text style={s.heading}>5. Third-Party Services</Text>
                <Text style={s.paragraph}>
                    Calora integrates with the following third-party services:
                    {'\n'}• Supabase – Authentication and database hosting
                    {'\n'}• Google Gemini AI – Meal photo analysis
                    {'\n'}• RevenueCat – Subscription management and payments
                    {'\n'}• Sentry – Crash reporting and error monitoring
                    {'\n'}• PostHog – Anonymous product analytics
                </Text>

                <Text style={s.heading}>6. Your Rights</Text>
                <Text style={s.paragraph}>
                    You can request access to, correction of, or deletion of your personal data at any time by
                    contacting support@calora.app. You may also export your data or delete your account through
                    the app settings.
                </Text>

                <Text style={s.heading}>7. Contact</Text>
                <Text style={s.paragraph}>
                    For privacy-related inquiries, contact us at support@calora.app.
                </Text>
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
    title: { color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
    body: { padding: 24, gap: 10 },
    updated: { color: TEXT_TERTIARY, fontSize: 12, marginBottom: 4 },
    heading: { color: TEXT_PRIMARY, fontSize: 14.5, fontWeight: '700', marginTop: 5 },
    paragraph: { color: TEXT_SECONDARY, fontSize: 13.5, lineHeight: 21 },
})
