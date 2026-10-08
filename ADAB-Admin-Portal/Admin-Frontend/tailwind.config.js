/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#15803D',
          dark: '#14532D',
          light: '#DCFCE7',
          coral: '#F97316',
        },
        admin: {
          slate: '#0F172A',
          accent: '#6366F1',
        },
      },
    },
  },
  plugins: [],
}
