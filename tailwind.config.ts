import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
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
        ink: { DEFAULT: '#0E0E0E', warm: '#1A1616', deep: '#100E0D' },
        canvas: '#FAFAFA',
        field: '#E3E3E3',
        surface: '#FFFFFF',
        accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', hover: 'rgb(var(--accent-hover) / <alpha-value>)' },
        highlight: 'rgb(var(--highlight) / <alpha-value>)',
        muted: '#676767',
        faint: '#9C9996',
        chip: '#D9D9D9',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        page: 'rgb(var(--page) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        control: 'rgb(var(--control) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        sub: 'rgb(var(--sub) / <alpha-value>)',
        well: 'rgb(var(--well) / <alpha-value>)',
        nav: 'rgb(var(--nav) / <alpha-value>)',
        line: 'rgb(var(--line) / var(--line-a))',
        'line-dark': 'rgba(255,255,255,0.08)',
        'line-light': 'rgba(0,0,0,0.08)',
      },
      borderRadius: {
        card: '30px',
        media: '12px',
        control: '7.5px',
        chip: '3px',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        ui: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        label: ['Jost', 'Geist', 'sans-serif'],
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
