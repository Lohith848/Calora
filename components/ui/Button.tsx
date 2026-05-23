import { Pressable, StyleSheet, ActivityIndicator, type PressableProps, type ViewStyle } from 'react-native'
import { Text } from './Text'
import {
  PRIMARY,
  ON_PRIMARY,
  ACCENT_DIM,
  ACCENT_BORDER,
  SURFACE_ELEVATED,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  SHADOW_SM,
} from '@/lib/theme'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label:    string
  variant?: ButtonVariant
  size?:    ButtonSize
  loading?: boolean
  style?:   ViewStyle
  fullWidth?: boolean
}

const SIZE_STYLES: Record<ButtonSize, { height: number; borderRadius: number; paddingHorizontal: number; fontSize: number }> = {
  sm:  { height: 36, borderRadius: 10, paddingHorizontal: 16, fontSize: 13 },
  md:  { height: 48, borderRadius: 14, paddingHorizontal: 20, fontSize: 15 },
  lg:  { height: 56, borderRadius: 16, paddingHorizontal: 24, fontSize: 16 },
}

export function Button({
  label,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  style,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const sz      = SIZE_STYLES[size]
  const isDisabled = disabled || loading

  const containerStyle: ViewStyle = {
    height:          sz.height,
    borderRadius:    sz.borderRadius,
    paddingHorizontal: sz.paddingHorizontal,
    alignItems:      'center',
    justifyContent:  'center',
    alignSelf:       fullWidth ? 'stretch' : 'flex-start',
    opacity:         isDisabled ? 0.4 : 1,
    overflow:        'hidden',
    ...(variant === 'primary' && {
      backgroundColor: PRIMARY,
      ...SHADOW_SM,
    }),
    ...(variant === 'secondary' && {
      backgroundColor: ACCENT_DIM,
      borderWidth: 1,
      borderColor: ACCENT_BORDER,
    }),
    ...(variant === 'outline' && {
      backgroundColor: SURFACE_ELEVATED,
      borderWidth: 1,
      borderColor: BORDER,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
    ...(variant === 'destructive' && {
      backgroundColor: 'rgba(186,26,26,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(186,26,26,0.15)',
    }),
  }

  const textColor =
    variant === 'primary'     ? ON_PRIMARY :
    variant === 'secondary'   ? PRIMARY :
    variant === 'outline'     ? TEXT_PRIMARY :
    variant === 'ghost'       ? TEXT_SECONDARY :
    variant === 'destructive' ? '#ba1a1a' :
    TEXT_PRIMARY

  return (
    <Pressable
      style={({ pressed }) => [
        containerStyle,
        pressed && !isDisabled && { opacity: 0.85 },
        style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? ON_PRIMARY : PRIMARY} />
      ) : (
        <Text style={{ color: textColor, fontSize: sz.fontSize, fontWeight: '700' }}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}
