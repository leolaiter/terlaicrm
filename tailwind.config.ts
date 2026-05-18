import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: '#F2F2F0',
        primary: '#1A1A1A',
        secondary: '#999999',
        label: '#AAAAAA',
        border: '#E5E5E5',
      },
      backdropBlur: {
        card: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config
