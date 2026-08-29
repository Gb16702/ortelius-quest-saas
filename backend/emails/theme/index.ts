export const theme = {
  colors: {
    background: {
      primary: 'hsla(0, 0%, 100%, 1)',
      secondary: 'hsla(0, 0%, 98%, 1)',
      tertiary: 'hsla(0, 0%, 95%, 1)',
    },
    border: {
      default: 'hsla(0, 0%, 92%, 1)',
    },
    blue: {
      primary: 'oklch(57.61% 0.2508 258.23)',
    },
    text: {
      primary: 'hsla(0, 0%, 9%, 1)',
      secondary: 'hsla(0, 0%, 40%, 1)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '14px',
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    full: '50px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
} as const

export type Theme = typeof theme