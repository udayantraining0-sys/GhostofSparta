const colors = {
  'space-black': '#0A0A0F',
  obsidian: '#111118',
  'dark-navy': '#0D1B2A',
  'neon-cyan': '#00F0FF',
  'electric-blue': '#1E90FF',
  holographic: '#00FFD1',
  'subtle-glow': 'rgba(255,255,255,0.06)',
  'glass-bg': 'rgba(10,10,15,0.7)',
  'glass-border': 'rgba(0,240,255,0.15)',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...colors,
      },
      backgroundColor: {
        glass: 'rgba(10, 10, 15, 0.7)',
        'glass-light': 'rgba(15, 15, 25, 0.5)',
        panel: 'rgba(5, 5, 12, 0.85)',
      },
      borderColor: {
        glass: 'rgba(0, 240, 255, 0.15)',
        'glass-active': 'rgba(0, 240, 255, 0.35)',
      },
      backdropBlur: {
        glass: '16px',
        'glass-heavy': '24px',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0,240,255,0.3), inset 0 0 20px rgba(0,240,255,0.05)',
        'neon-cyan-sm': '0 0 10px rgba(0,240,255,0.2)',
        'cyber-glow': '0 0 40px rgba(0,240,255,0.15)',
        'core-pulse': '0 0 60px rgba(0,240,255,0.5)',
        'panel': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,240,255,0.1)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 6s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0,240,255,0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(0,240,255,0.4), 0 0 80px rgba(0,240,255,0.1)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
