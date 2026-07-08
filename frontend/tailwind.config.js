/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          dark: '#1e293b',
          light: '#3b82f6'
        },
        accent: {
          DEFAULT: '#10B981',
          dark: '#047857',
          light: '#34d399'
        },
        slate: {
          850: '#1a2332',
          750: '#283548',
          650: '#3e4f66',
          550: '#576b84',
          450: '#7e92ab',
          350: '#a5b8ce',
          250: '#c9d8e8'
        },
        orange: {
          450: '#f97316'
        },
        yellow: {
          450: '#eab308'
        }
      },
      animation: {
        'scale-up': 'scaleUp 0.2s ease-out',
        'fade-in-down': 'fadeInDown 0.2s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      }
    },
  },
  plugins: [],
}
