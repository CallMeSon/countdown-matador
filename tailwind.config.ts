import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'matador-green': '#10b981',
        'matador-red': '#ef4444',
        'matador-cyan': '#06b6d4',
        'matador-yellow': '#eab308',
        'matador-orange': '#f97316',
        'matador-dark': '#000000',
        'matador-panel': '#111111',
        'matador-card': '#1a1a1a',
        'matador-border': '#333333',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        anton: ['Anton', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
      animation: {
        'overtime-pulse': 'overtimePulse 1s ease-in-out infinite',
        'cue-flash': 'cueFlash 2s ease-in-out forwards',
        'ticker-scroll': 'tickerScroll 15s linear infinite',
        'tally-blink': 'tallyBlink 1.5s ease-in-out infinite',
      },
      keyframes: {
        overtimePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        cueFlash: {
          '0%': { opacity: '0' },
          '10%': { opacity: '0.85' },
          '80%': { opacity: '0.85' },
          '100%': { opacity: '0' },
        },
        tickerScroll: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        tallyBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
