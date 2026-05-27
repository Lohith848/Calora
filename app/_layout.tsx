import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { Stack, useNavigationContainerRef } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister } from '@/lib/queryClient'
import * as Sentry from '@sentry/react-native'

import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk'

const routingInstrumentation = Sentry.reactNavigationIntegration()

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  integrations: [routingInstrumentation],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (__DEV__) return null
    return event
  },
})

import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { ThemeProvider, DefaultTheme } from '@react-navigation/native'
import { PostHogProvider } from 'posthog-react-native'
import { I18nextProvider } from 'react-i18next'

import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { posthog, isPostHogEnabled, identify, resetIdentity, track } from '@/lib/analytics'
import { configureRevenueCat, loginRevenueCat, logoutRevenueCat } from '@/lib/purchases'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { ToastProvider } from '@/contexts/ToastContext'
import i18n, { initI18n } from '@/lib/i18n'
import OfflineBanner from '@/components/OfflineBanner'
import OfflineOverlay from '@/components/OfflineOverlay'
import { Text } from '@/components/ui/Text'
import { BG, SURFACE_CONTAINER_LOWEST, ON_SURFACE } from '@/lib/theme'

function ErrorFallback() {
  return (
    <View style={eb.container}>
      <Text style={eb.title}>Something went wrong</Text>
      <Text style={eb.subtitle}>Please close and reopen the app.</Text>
    </View>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) return <ErrorFallback />
    return this.props.children
  }
}

const eb = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  title: { color: ON_SURFACE, fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: 'rgba(0,0,0,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
})

const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: BG,
    card: SURFACE_CONTAINER_LOWEST,
    text: ON_SURFACE,
    border: '#cfc4c5',
    primary: '#000000',
  },
}

function MaybePostHogProvider({ children }: { children: React.ReactNode }) {
  if (isPostHogEnabled && posthog) {
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
  }
  return <>{children}</>
}

function ScreenTracker() {
  const pathname = usePathname()
  useEffect(() => {
    track('screen_viewed', { screen: pathname })
  }, [pathname])
  return null
}
import { usePathname } from 'expo-router'

function RootLayout() {
  const navigationRef = useNavigationContainerRef()
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  })

  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [i18nReady, setI18nReady] = useState(false)

  useEffect(() => {
    initI18n().then(() => setI18nReady(true))
  }, [])

  useEffect(() => {
    if (navigationRef.current) {
      routingInstrumentation.registerNavigationContainer(navigationRef)
    }
  }, [navigationRef])

  useEffect(() => {
    configureRevenueCat()

    if (!isSupabaseEnabled) {
      setIsAuthed(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session)
      if (session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
        loginRevenueCat(session.user.id)
        identify(
          session.user.id,
          session.user.email ? { email: session.user.email } : undefined
        )
      } else {
        setOnboardingCompleted(null)
      }
    }).catch(() => {
      console.warn('[Auth] Could not reach Supabase — defaulting to signed-out state.')
      setIsAuthed(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthed(true)
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
        loginRevenueCat(session.user.id)
        identify(
          session.user.id,
          session.user.email ? { email: session.user.email } : undefined
        )
      }
      if (event === 'SIGNED_OUT') {
        setIsAuthed(false)
        setOnboardingCompleted(null)
        logoutRevenueCat()
        resetIdentity()
      }
      if (event === 'USER_UPDATED' && session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setOnboardingCompleted(session.user.user_metadata?.onboarding_completed === true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!__DEV__) return
    let cleanup: (() => void) | undefined
    import('react-native').then(({ DeviceEventEmitter }) => {
      const sub1 = DeviceEventEmitter.addListener('__dev_skip_auth__', () => {
        setIsAuthed(true)
        setOnboardingCompleted(false)
      })
      const sub2 = DeviceEventEmitter.addListener('__dev_complete_onboarding__', () => {
        setIsAuthed(true)
        setOnboardingCompleted(true)
      })
      cleanup = () => {
        sub1.remove()
        sub2.remove()
      }
    })
    return () => cleanup?.()
  }, [])

  if (!fontsLoaded || isAuthed === null || !i18nReady || (isAuthed === true && onboardingCompleted === null)) {
    return <View style={{ flex: 1, backgroundColor: BG }} />
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <MaybePostHogProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
          <SubscriptionProvider>
            <ToastProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
                <BottomSheetModalProvider>
                  <StatusBar
                    style="dark"
                    translucent={Platform.OS === 'android'}
                    backgroundColor={Platform.OS === 'android' ? BG : undefined}
                  />
                  <ThemeProvider value={customLightTheme}>
                    <View style={{ flex: 1, backgroundColor: BG }}>
                      <Stack
                        ref={navigationRef}
                        screenOptions={{
                          headerShown: false,
                          animation: 'fade',
                          contentStyle: { backgroundColor: BG },
                        }}
                      >
                        <Stack.Protected guard={!isAuthed}>
                          <Stack.Screen name="index" />
                          <Stack.Screen name="(auth)" />
                        </Stack.Protected>

                        <Stack.Protected guard={!!isAuthed && onboardingCompleted === false}>
                          <Stack.Screen name="(onboarding)" />
                        </Stack.Protected>

                        <Stack.Protected guard={!!isAuthed && onboardingCompleted === true}>
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="scan" />
                          <Stack.Screen name="detail/[id]" />
                          <Stack.Screen name="settings" />
                          <Stack.Screen name="support" />
                        </Stack.Protected>

                        <Stack.Screen name="upgrade" />
                        <Stack.Screen name="privacy" />
                        <Stack.Screen name="terms" />
                      </Stack>
                      <ScreenTracker />
                      <OfflineBanner />
                      <OfflineOverlay />
                    </View>
                  </ThemeProvider>
                </BottomSheetModalProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
            </ToastProvider>
          </SubscriptionProvider>
          </PersistQueryClientProvider>
        </MaybePostHogProvider>
      </I18nextProvider>
    </ErrorBoundary>
  )
}

export default Sentry.wrap(RootLayout)
