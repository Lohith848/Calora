import { Text as RNText, StyleSheet, type TextProps } from 'react-native'
import { weightToFamily } from '@/lib/typography'

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {}
  const { fontWeight, fontFamily: explicitFamily, ...restFlat } = flat
  const fontFamily = explicitFamily ?? weightToFamily(fontWeight)

  return (
    <RNText
      style={[restFlat, { fontFamily, includeFontPadding: false }]}
      {...props}
    />
  )
}
