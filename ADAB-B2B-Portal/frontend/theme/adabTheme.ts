
/**
 * ADAB Brand Theme Tokens
 * Strict adherence to Primary Green, Secondary Orange, and Neutral palette.
 */

export const adabTheme = {
  colors: {
    brand: {
      primary: '#00843D', // ADAB Green
      secondary: '#FF8200', // ADAB Orange
    },
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
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
      },
    },
  },
  spacing: {
    container: '1280px',
    sidebar: '280px',
    header: '64px',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
  },
} as const;

export type AdabTheme = typeof adabTheme;
