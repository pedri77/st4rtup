/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF4FF',
          100: '#D6E8FF',
          200: '#ADC8FF',
          300: '#7BA4F5',
          400: '#4B84ED',
          500: '#1E6FD9',
          600: '#1A5FB8',
          700: '#154D96',
          800: '#103B74',
          900: '#0B2952',
          950: '#071A36',
        },
        brand: {
          DEFAULT: '#1E6FD9',
          light: '#3B82F6',
          dark: '#154D96',
        },
      },
    },
  },
  plugins: [],
}
