/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#fd5757',
        'primary-dark': '#e64a4a',
        'secondary': '#5ce1e5',
        'secondary-dark': '#3ec9d0',
        'dark-gray': '#1a1a2e',
        'light-gray': '#f5f7fa',
        'bg-light': '#f5f7fa',
        'text-dark': '#1a1a2e',
        'text-light': '#666666',
        'border-light': '#e0e0e0',
      },
      fontFamily: {
        'sans':        ['Bricolage Grotesque', 'sans-serif'],
        'serif':       ['Bricolage Grotesque', 'sans-serif'],
        'mono':        ['Bricolage Grotesque', 'sans-serif'],
        'figtree':     ['Bricolage Grotesque', 'sans-serif'],
        'cormorant':   ['Bricolage Grotesque', 'sans-serif'],
        'quicksand':   ['Bricolage Grotesque', 'sans-serif'],
        'poppins':     ['Bricolage Grotesque', 'sans-serif'],
        'inter':       ['Bricolage Grotesque', 'sans-serif'],
        'roboto-mono': ['Bricolage Grotesque', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'cyan-glow': '0 0 20px rgba(92, 225, 229, 0.3)',
        'red-glow': '0 0 20px rgba(253, 87, 87, 0.2)',
      },
      animation: {
        'pulse-cyan': 'pulse-cyan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounce-soft 0.2s ease-out',
      },
      keyframes: {
        'pulse-cyan': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'bounce-soft': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(2px)' },
        },
      },
    },
  },
  plugins: [],
}
