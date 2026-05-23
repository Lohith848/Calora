import { View, StyleSheet, type ViewProps } from 'react-native'
import { SURFACE_ELEVATED, SHADOW_SM, BORDER } from '@/lib/theme'

interface CardProps extends ViewProps {
  compact?: boolean
}

export function Card({ compact, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        compact ? styles.compact : styles.normal,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...SHADOW_SM,
  },
  normal: { padding: 16 },
  compact: { padding: 10 },
})
