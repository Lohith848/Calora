import { ScrollView, StyleSheet, View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ON_SURFACE_VARIANT, BORDER } from '@/lib/theme'

export default function TermsScreen() {
    const insets = useSafeAreaInsets()

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="chevron-back" size={24} color={ON_SURFACE_VARIANT} />
                </Pressable>
                <Text style={s.title}>Terms of Service</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                <Text style={s.updated}>Last updated: {new Date().toLocaleDateString()}</Text>

                <Text style={s.heading}>1. Acceptance of Terms</Text>
                <Text style={s.paragraph}>
                    By using Calora, you agree to these Terms of Service. If you do not agree, do not use the app.
                    We reserve the right to update these terms at any time, with notice provided through the app.
                </Text>

                <Text style={s.heading}>2. Description of Service</Text>
                <Text style={s.paragraph}>
                    Calora is a nutrition tracking application that uses AI to analyze meal photos and estimate
                    caloric and macronutrient content. Nutritional estimates are approximations and should not
                    be used as medical advice. Always consult a qualified healthcare professional for dietary decisions.
                </Text>

                <Text style={s.heading}>3. User Accounts</Text>
                <Text style={s.paragraph}>
                    You are responsible for maintaining the confidentiality of your account credentials and for all
                    activities that occur under your account. You must provide accurate information when creating
                    your account and promptly update it if changes occur.
                </Text>

                <Text style={s.heading}>4. Subscriptions & Billing</Text>
                <Text style={s.paragraph}>
                    Calora offers subscription plans (Medium and Premium) with recurring billing. Subscriptions
                    auto-renew unless cancelled at least 24 hours before the end of the current billing period.
                    {'\n\n'}• Free tier includes limited AI scans per day
                    {'\n'}• Paid tiers unlock unlimited scans and premium features
                    {'\n'}• Cancellations take effect at the end of the current billing period
                    {'\n'}• Refunds are handled per Apple App Store and Google Play Store policies
                </Text>

                <Text style={s.heading}>5. Acceptable Use</Text>
                <Text style={s.paragraph}>
                    You agree not to:
                    {'\n'}• Use the service for any unlawful purpose
                    {'\n'}• Attempt to bypass subscription restrictions
                    {'\n'}• Upload inappropriate or offensive meal images
                    {'\n'}• Interfere with the proper functioning of the app
                    {'\n'}• Attempt to access other users' data
                </Text>

                <Text style={s.heading}>6. Limitation of Liability</Text>
                <Text style={s.paragraph}>
                    Calora provides nutritional estimates for informational purposes only. We are not responsible for
                    any decisions made based on this information. The app is provided "as is" without warranties of
                    accuracy, completeness, or fitness for a particular purpose.
                </Text>

                <Text style={s.heading}>7. Termination</Text>
                <Text style={s.paragraph}>
                    We may suspend or terminate your access to Calora for violation of these terms. Upon termination,
                    your right to use the service ceases immediately. Your data may be retained for a reasonable period
                    to allow for export.
                </Text>

                <Text style={s.heading}>8. Contact</Text>
                <Text style={s.paragraph}>
                    For questions about these terms, contact support@calora.app.
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
