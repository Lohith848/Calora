/**
 * 🎨 BRAND — central theme constants.
 *
 * Change ACCENT (and the matching tailwind.config.js color) to rebrand the
 * entire app in one edit. All components import from here instead of
 * hardcoding color strings.
 *
 * Steps to rebrand:
 *   1. Change ACCENT below to your hex color
 *   2. Change the `accent` key in tailwind.config.js to the same hex
 *   3. Optionally change BG for a different dark shade
 */

// ── Primary brand color ───────────────────────────────────────────────────────
// 🎨 Central black accent for primary buttons and status highlights
export const ACCENT = '#000000'

// Derived from ACCENT — adjust opacity as needed
export const ACCENT_DIM = 'rgba(0,0,0,0.05)'
export const ACCENT_BORDER = 'rgba(0,0,0,0.12)'
export const ACCENT_GLOW = 'rgba(0,0,0,0.08)'
export const ACCENT_LIGHT = '#333333'

// ── Backgrounds ───────────────────────────────────────────────────────────────
export const BG = '#f9f9f9'              // system grouped background
export const SURFACE = '#ffffff'         // elevated card white
export const SURFACE2 = '#f3f3f3'        // low container gray
export const SURFACE3 = '#eeeeee'        // more elevated container gray

// ── Text ──────────────────────────────────────────────────────────────────────
export const TEXT_PRIMARY = '#1b1b1b'
export const TEXT_SECONDARY = '#5d5e63'
export const TEXT_TERTIARY = '#848484'
export const TEXT_DISABLED = '#c6c6cb'

// ── Borders ───────────────────────────────────────────────────────────────────
export const BORDER = 'rgba(0,0,0,0.08)'
export const BORDER_ACTIVE = 'rgba(0,0,0,0.18)'

// ── Semantic / Macro Colors ───────────────────────────────────────────────────
export const ERROR = '#ba1a1a'
export const ERROR_DIM = '#ffdad6'
export const WARNING = '#FFCC00'          // Fat yellow
export const SUCCESS = '#34C759'          // Protein green
export const CARBS = '#007AFF'            // Carbs blue
export const ENERGY_ORANGE = '#FF9500'     // Calories orange
export const STREAK_RED = '#FF3B30'        // Streak red
export const WATER_CYAN = '#5AC8FA'        // Water cyan

// ── Tab bar ───────────────────────────────────────────────────────────────────
export const TAB_ACTIVE = '#000000'
export const TAB_INACTIVE = '#616267'
export const TAB_HEIGHT = 68
