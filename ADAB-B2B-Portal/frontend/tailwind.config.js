/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        adab: {
          green: '#6BCF2D',
          darkGreen: '#2E7D32',
          orange: '#F7931E',
          bg: '#F9FAFB',
          text: '#1F2937'
        },
        dark: {
          app: {
            primary: '#0B0F14',
            secondary: '#10161D',
            tertiary: '#151C24'
          },
          surface: {
            card: '#141B23',
            elevated: '#18212B',
            hover: '#1D2732',
            active: '#222D39'
          },
          sidebar: {
            bg: '#0A0F14',
            hover: '#151D26',
            active: '#1C2732'
          },
          header: {
            bg: '#0D131A'
          },
          border: {
            primary: '#27313C',
            secondary: '#202A34'
          },
          text: {
            primary: '#F3F6F9',
            secondary: '#B7C0CA',
            muted: '#7F8A96',
            disabled: '#59636E'
          },
          accent: {
            primary: '#4F8CFF',
            hover: '#6A9FFF',
            active: '#3B76E8',
            success: '#35C98A',
            warning: '#F2B84B',
            error: '#F05D6C',
            info: '#55A8FF'
          }
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
}
