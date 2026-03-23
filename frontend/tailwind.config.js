/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  safelist: [
    'animate-float',
    'animate-float-slow',
    'animate-float-delay',
    'animate-shimmer',
    'animate-gradient-shift',
    'animate-spin-slow',
    'animate-pulse-ring',
    'animate-fade-in-up',
    'animate-fade-in-down',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'float':           'float 4s ease-in-out infinite',
        'float-slow':      'floatSlow 6s ease-in-out infinite',
        'float-delay':     'float 4s ease-in-out 1.5s infinite',
        'gradient-shift':  'gradientShift 12s ease infinite',
        'shimmer':         'shimmer 3.5s linear infinite',
        'spin-slow':       'spinSlow 20s linear infinite',
        'pulse-ring':      'pulseRing 2.2s cubic-bezier(0.455,0.03,0.515,0.955) infinite',
        'fade-in-up':      'fadeInUp 0.6s ease forwards',
        'fade-in-down':    'fadeInDown 0.5s ease forwards',
        'bounce-slow':     'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':     { transform: 'translateY(-8px) rotate(1deg)' },
        },
        gradientShift: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.96)', boxShadow: '0 0 0 0 rgba(99,102,241,0.5)' },
          '70%':  { transform: 'scale(1)',    boxShadow: '0 0 0 14px rgba(99,102,241,0)' },
          '100%': { transform: 'scale(0.96)', boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
