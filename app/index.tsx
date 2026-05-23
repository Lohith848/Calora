import { useEffect } from 'react'
import { View, Pressable, StyleSheet, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import {
    SURFACE_ELEVATED,
    SURFACE_CONTAINER_LOW,
    ON_SURFACE,
    ON_SURFACE_VARIANT,
    OUTLINE,
    OUTLINE_VARIANT,
    PRIMARY,
    ACCENT,
    ACCENT_DIM,
    ACCENT_BORDER,
    SHADOW_SM,
    SHADOW_LG,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    BG,
    BORDER,
} from '@/lib/theme'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/constants'
import { adjustBrightness } from '@/lib/utils'

const { width: SW, height: SH } = Dimensions.get('window')

const FEATURES = [
    { icon: 'shield-checkmark-outline' as const, title: 'Secure by Default', desc: 'End-to-end encrypted auth' },
    { icon: 'flash-outline' as const, title: 'Blazing Fast', desc: 'Optimized for performance' },
    { icon: 'cloud-done-outline' as const, title: 'Always in Sync', desc: 'Real-time data across devices' },
]

export default function LandingScreen() {
    const insets = useSafeAreaInsets()

    const headerY = useSharedValue(-20)
    const headerOpacity = useSharedValue(0)
    const heroScale = useSharedValue(0.88)
    const heroOpacity = useSharedValue(0)
    const featuresY = useSharedValue(30)
    const featuresOpacity = useSharedValue(0)
    const footerOpacity = useSharedValue(0)
    const orbOneY = useSharedValue(0)
    const orbTwoY = useSharedValue(0)

    useEffect(() => {
        headerY.value = withSpring(0, { damping: 16, stiffness: 120 })
        headerOpacity.value = withTiming(1, { duration: 500 })

        heroScale.value = withDelay(180, withSpring(1, { damping: 14, stiffness: 100 }))
        heroOpacity.value = withDelay(180, withTiming(1, { duration: 550 }))

        featuresY.value = withDelay(380, withSpring(0, { damping: 16, stiffness: 110 }))
        featuresOpacity.value = withDelay(380, withTiming(1, { duration: 480 }))

        footerOpacity.value = withDelay(550, withTiming(1, { duration: 500 }))

        orbOneY.value = withRepeat(
            withSequence(
                withTiming(-16, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.sin) })
            ), -1, true
        )
        orbTwoY.value = withRepeat(
            withSequence(
                withTiming(14, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
            ), -1, true
        )
    }, [])

    const headerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: headerY.value }],
        opacity: headerOpacity.value,
    }))
    const heroStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heroScale.value }],
        opacity: heroOpacity.value,
    }))
    const featuresStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: featuresY.value }],
        opacity: featuresOpacity.value,
    }))
    const footerStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.value }))
    const orbOneStyle = useAnimatedStyle(() => ({ transform: [{ translateY: orbOneY.value }] }))
    const orbTwoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: orbTwoY.value }] }))

    return (
        <View style={s.root}>
            {/* Floating decorative orbs */}
            <Animated.View pointerEvents="none" style={[s.orbOne, orbOneStyle]} />
            <Animated.View pointerEvents="none" style={[s.orbTwo, orbTwoStyle]} />

            {/* ── Rounded header bar ── */}
            <Animated.View style={[s.headerOuter, { marginTop: insets.top + 10 }, headerStyle]}>
                <View style={s.headerBar}>
                    <View style={s.headerLeft}>
                        <View style={s.headerLogo}>
                            <Text style={s.headerLogoText}>{APP_NAME.charAt(0)}</Text>
                        </View>
                        <Text style={s.headerAppName}>{APP_NAME}</Text>
                    </View>

                    <Pressable
                        onPress={() => router.push('/(auth)/login')}
                        style={({ pressed }) => [s.headerCta, pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] }]}
                    >
                        <View style={s.headerCtaInner}>
                            <Text style={s.headerCtaText}>Get Started</Text>
                        </View>
                    </Pressable>
                </View>
            </Animated.View>

            {/* ── Hero section ── */}
            <Animated.View style={[s.heroWrap, heroStyle]}>
                <View style={s.iconOuter}>
                    <Text style={s.iconLetter}>{APP_NAME.charAt(0)}</Text>
                </View>
                <Text style={s.heroTitle}>{APP_NAME}</Text>
                <Text style={s.heroTagline}>{APP_TAGLINE}</Text>
                <Text style={s.heroDesc}>{APP_DESCRIPTION}</Text>
            </Animated.View>

            {/* ── Feature highlights ── */}
            <Animated.View style={[s.featuresWrap, featuresStyle]}>
                {FEATURES.map((feat, i) => (
                    <View key={i} style={s.featureRow}>
                        <View style={s.featureIconWrap}>
                            <Ionicons name={feat.icon} size={18} color={PRIMARY} />
                        </View>
                        <View style={s.featureTextWrap}>
                            <Text style={s.featureTitle}>{feat.title}</Text>
                            <Text style={s.featureDesc}>{feat.desc}</Text>
                        </View>
                    </View>
                ))}
            </Animated.View>

            {/* ── Footer ── */}
            <Animated.View style={[s.footer, footerStyle, { paddingBottom: insets.bottom + 20 }]}>
                <Pressable
                    onPress={() => router.push('/(auth)/login')}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                    <Text style={s.signInText}>Already have an account? <Text style={s.signInLink}>Sign in</Text></Text>
                </Pressable>

                <Text style={s.legal}>
                    By continuing you agree to our{' '}
                    <Text onPress={() => router.push('/terms')} style={s.legalLink}>Terms</Text>
                    {' '}and{' '}
                    <Text onPress={() => router.push('/privacy')} style={s.legalLink}>Privacy Policy</Text>
                </Text>
            </Animated.View>
        </View>
    )
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    orbOne: {
        position: 'absolute',
        right: -SW * 0.25,
        top: SH * 0.06,
        width: SW * 0.72,
        height: SW * 0.72,
        borderRadius: 999,
        backgroundColor: ACCENT_DIM,
    },
    orbTwo: {
        position: 'absolute',
        left: -SW * 0.32,
        bottom: SH * 0.18,
        width: SW * 0.66,
        height: SW * 0.66,
        borderRadius: 999,
        backgroundColor: ACCENT_DIM,
    },

    headerOuter: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerBar: {
        width: '95%',
        height: 58,
        borderRadius: 999,
        backgroundColor: SURFACE_ELEVATED,
        borderWidth: 1,
        borderColor: OUTLINE_VARIANT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 6,
        paddingRight: 6,
        ...SHADOW_SM,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerLogo: {
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLogoText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    headerAppName: {
        color: ON_SURFACE,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    headerCta: {
        borderRadius: 999,
        overflow: 'hidden',
    },
    headerCtaInner: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: PRIMARY,
    },
    headerCtaText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    heroWrap: {
        paddingHorizontal: 24,
        paddingTop: 40,
        gap: 10,
    },
    iconOuter: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: PRIMARY,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        ...SHADOW_LG,
    },
    iconLetter: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
    },
    heroTitle: {
        color: ON_SURFACE,
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.8,
        lineHeight: 40,
    },
    heroTagline: {
        color: ON_SURFACE_VARIANT,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
    heroDesc: {
        color: TEXT_TERTIARY,
        fontSize: 14,
        lineHeight: 21,
        maxWidth: 320,
        marginTop: 2,
    },

    featuresWrap: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 14,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: SURFACE_ELEVATED,
        borderWidth: 1,
        borderColor: ACCENT_BORDER,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        ...SHADOW_SM,
    },
    featureIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: ACCENT_DIM,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTextWrap: {
        flex: 1,
        gap: 2,
    },
    featureTitle: {
        color: ON_SURFACE,
        fontSize: 14,
        fontWeight: '700',
    },
    featureDesc: {
        color: TEXT_TERTIARY,
        fontSize: 12.5,
    },

    footer: {
        paddingHorizontal: 20,
        gap: 10,
        alignItems: 'center',
    },
    signInText: {
        color: TEXT_TERTIARY,
        fontSize: 13,
    },
    signInLink: {
        color: PRIMARY,
        fontWeight: '600',
    },
    legal: {
        color: TEXT_TERTIARY,
        textAlign: 'center',
        fontSize: 11,
        lineHeight: 17,
        paddingHorizontal: 8,
    },
    legalLink: {
        color: TEXT_SECONDARY,
        textDecorationLine: 'underline',
    },
})
