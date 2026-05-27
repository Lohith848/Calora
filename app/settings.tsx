import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Switch, ActivityIndicator, TextInput } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import SettingsRow from '@/components/ui/SettingsRow'
import { AlertModal } from '@/components/ui/AppModal'
import {
  BG,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  SURFACE_ELEVATED,
  ON_SURFACE_VARIANT,
  PRIMARY,
  ACCENT_DIM,
  ACCENT,
  SHADOW_SM,
  SURFACE_CONTAINER_LOW,
} from '@/lib/theme'
import { useUserSettings, useUpdateSettings } from '@/hooks/useUserSettings'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { data: settings, isLoading } = useUserSettings()
  const updateSettings = useUpdateSettings()

  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [statusModal, setStatusModal] = useState<{ title: string; message: string } | null>(null)

  const handleToggle = async (key: 'pushEnabled' | 'weeklyDigest' | 'compactMode', value: boolean) => {
    await updateSettings.mutateAsync({ [key]: value })
  }

  const handleSetEmail = async () => {
    const email = emailInput.trim()
    if (!email || !email.includes('@')) {
      setStatusModal({ title: 'Invalid Email', message: 'Please enter a valid email address.' })
      return
    }
    await updateSettings.mutateAsync({ emailForReports: email, weeklyDigest: true })
    setShowEmailInput(false)
    setEmailInput('')
    setStatusModal({ title: 'Email Updated', message: 'Weekly reports will be sent to ' + email })
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={ON_SURFACE_VARIANT} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={TEXT_TERTIARY} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={s.sectionTitle}>Notifications & Reports</Text>
            <Card compact style={s.groupCard}>
              <SwitchRow
                label="Push notifications"
                subtitle="Alerts for streak milestones and goal achievements"
                value={settings?.pushEnabled ?? true}
                onValueChange={(v) => handleToggle('pushEnabled', v)}
              />
              <SwitchRow
                label="Weekly email digest"
                subtitle="Receive a Monday summary of your nutrition data"
                value={settings?.weeklyDigest ?? true}
                onValueChange={(v) => handleToggle('weeklyDigest', v)}
              />
              {settings?.weeklyDigest && (
                <View style={s.emailRow}>
                  <Ionicons name="mail-outline" size={16} color={TEXT_SECONDARY} />
                  <Text style={s.emailLabel}>
                    {settings.emailForReports ? `Reports to: ${settings.emailForReports}` : 'No email set for reports'}
                  </Text>
                  <Pressable onPress={() => { setEmailInput(settings.emailForReports ?? ''); setShowEmailInput(true) }} style={s.emailEditBtn}>
                    <Text style={s.emailEditText}>{settings.emailForReports ? 'Change' : 'Set'}</Text>
                  </Pressable>
                </View>
              )}
            </Card>

            <Text style={s.sectionTitle}>Display</Text>
            <Card compact style={s.groupCard}>
              <SwitchRow
                label="Compact mode"
                subtitle="Denser list rows for productivity"
                value={settings?.compactMode ?? false}
                onValueChange={(v) => handleToggle('compactMode', v)}
                last
              />
            </Card>

            <Text style={s.sectionTitle}>Account</Text>
            <Card compact style={s.groupCard}>
              <SettingsRow label="Change Password" icon="lock-closed-outline" onPress={async () => {
                if (isSupabaseEnabled) {
                  const { error } = await supabase.auth.updateUser({ password: '' })
                  if (error) setStatusModal({ title: 'Error', message: error.message })
                }
              }} />
              <SettingsRow label="Delete Account" icon="trash-outline" onPress={() => {
                setStatusModal({
                  title: 'Delete Account',
                  message: 'Contact support@calora.app to request account deletion.',
                })
              }} last />
            </Card>

            <Text style={s.sectionTitle}>Legal</Text>
            <Card compact style={s.groupCard}>
              <SettingsRow label="Privacy Policy" icon="document-text-outline" onPress={() => router.push('/privacy')} />
              <SettingsRow label="Terms of Service" icon="shield-checkmark-outline" onPress={() => router.push('/terms')} last />
            </Card>

            {/* Email Input Modal */}
            {showEmailInput && (
              <Card style={s.emailInputCard}>
                <Text style={s.emailInputLabel}>Email for weekly reports</Text>
                <View style={s.emailInputRow}>
                  <TextInput
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="you@example.com"
                    placeholderTextColor={TEXT_TERTIARY}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={s.emailFieldInput}
                  />
                  <Pressable onPress={handleSetEmail} style={s.emailSaveBtn}>
                    <Text style={s.emailSaveText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowEmailInput(false)} style={s.emailCancelBtn}>
                    <Text style={s.emailCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <AlertModal
        visible={!!statusModal}
        title={statusModal?.title ?? ''}
        message={statusModal?.message}
        buttons={[{ text: 'OK', onPress: () => setStatusModal(null) }]}
        onDismiss={() => setStatusModal(null)}
      />
    </View>
  )
}

function SwitchRow({
  label, subtitle, value, onValueChange, last,
}: {
  label: string; subtitle: string; value: boolean; onValueChange: (next: boolean) => void; last?: boolean
}) {
  return (
    <View style={[s.row, !last && s.rowDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: PRIMARY }}
        thumbColor={value ? SURFACE_ELEVATED : '#f4f4f5'}
      />
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
  body: { padding: 20, gap: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  groupCard: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowLabel: { color: TEXT_PRIMARY, fontSize: 14.5, fontWeight: '600' },
  rowSub: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: SURFACE_CONTAINER_LOW,
  },
  emailLabel: { flex: 1, fontSize: 12, color: TEXT_SECONDARY },
  emailEditBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: ACCENT_DIM },
  emailEditText: { fontSize: 12, color: ACCENT, fontWeight: '600' },
  emailInputCard: { padding: 14, gap: 8 },
  emailInputLabel: { fontSize: 11, fontWeight: '700', color: TEXT_TERTIARY, letterSpacing: 0.8, textTransform: 'uppercase' },
  emailInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emailSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: 8 },
  emailSaveText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emailCancelBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: SURFACE_CONTAINER_LOW },
  emailCancelText: { color: TEXT_TERTIARY, fontSize: 13, fontWeight: '600' },
  emailFieldInput: {
    flex: 1,
    height: 44,
    backgroundColor: SURFACE_CONTAINER_LOW,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
})
