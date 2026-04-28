/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg:       '#08080f',
          surface:  '#0e0e1a',
          card:     '#13131f',
          border:   '#1e1e30',
          gold:     '#f5c842',
          amber:    '#f59e0b',
          green:    '#10b981',
          red:      '#ef4444',
          blue:     '#3b82f6',
          muted:    '#6b7280',
          text:     '#e2e8f0',
          textDim:  '#94a3b8',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'scan-line':    'scanLine 2s linear infinite',
        'fade-in-up':   'fadeInUp 0.6s ease-out forwards',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite',
        'card-flip':    'none',
        'spin-slow':    'spin 3s linear infinite',
      },
      keyframes: {
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeInUp: {
          '0%':   { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.6 },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(245, 200, 66, 0.3)' },
          '50%':      { boxShadow: '0 0 30px rgba(245, 200, 66, 0.7)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
