export const Fonts = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  black: 'HankenGrotesk_800ExtraBold',
}

export function weightToFamily(weight?: string | number | null): string | undefined {
  switch (String(weight ?? '400')) {
    case '500': return Fonts.medium
    case '600': return Fonts.semibold
    case '700':
    case 'bold': return Fonts.bold
    case '800':
    case '900': return Fonts.black
    default: return Fonts.regular
  }
}

export const TypeScale = {
  'display-lg': {
    fontFamily: Fonts.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.02,
  },
  'display-lg-mobile': {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 38,
  },
  'headline-lg': {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.01,
  },
  'headline-md': {
    fontFamily: Fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
  },
  'body-lg': {
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 24,
  },
  'body-md': {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  'label-lg': {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.01,
  },
  'label-sm': {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.02,
  },
  xs: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16 },
  sm: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  base: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22 },
  lg: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 24 },
  xl: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 28 },
  '2xl': { fontFamily: Fonts.bold, fontSize: 24, lineHeight: 32 },
  '3xl': { fontFamily: Fonts.bold, fontSize: 30, lineHeight: 38 },
  '4xl': { fontFamily: Fonts.black, fontSize: 36, lineHeight: 44 },
} as const
