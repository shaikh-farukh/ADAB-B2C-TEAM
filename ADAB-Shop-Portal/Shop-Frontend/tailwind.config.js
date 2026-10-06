/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#22C55E',
          dark: '#15803D',
          light: '#DCFCE7',
          orange: '#F97316'
        }
      }
    },
  },
  plugins: [],
}
