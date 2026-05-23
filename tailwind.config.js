/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#f9f9f9',
        accent: '#000000',
        surface: '#ffffff',
        'surface-dim': '#dadada',
        'surface-bright': '#f9f9f9',
        'on-surface': '#1b1b1b',
        'on-surface-variant': '#4c4546',
        outline: '#7e7576',
        'outline-variant': '#cfc4c5',
        'protein-green': '#34C759',
        'energy-orange': '#FF9500',
        'carb-blue': '#007AFF',
        'fat-yellow': '#FFCC00',
        'water-cyan': '#5AC8FA',
        'streak-red': '#FF3B30',
      },
    },
  },
  plugins: [],
}
