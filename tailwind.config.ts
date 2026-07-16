import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          bg: '#f2ece4',
          card: '#ffffff',
          border: '#e0d5c9',
          text: '#1a1612',
          muted: '#7a6f66',
          primary: '#0d5a52',
          'primary-hover': '#0a4840',
          gold: '#b87524',
          'gold-light': '#f7eedf',
        },
      },
      boxShadow: {
        card: '0 1px 4px rgba(26,22,18,0.06), 0 4px 16px rgba(26,22,18,0.04)',
        'card-hover': '0 4px 12px rgba(26,22,18,0.10), 0 8px 24px rgba(26,22,18,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'soft-ping': 'softPing 2.6s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        softPing: {
          '0%': { transform: 'scale(1)', opacity: '0.45' },
          '70%, 100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
