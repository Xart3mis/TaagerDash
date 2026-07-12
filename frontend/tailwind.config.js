/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eafbfc',
          100: '#c4f3f6',
          200: '#84e5ef',
          300: '#40d2e5',
          400: '#12b8d0',
          500: '#0e9eb0',
          600: '#0d8498',
          700: '#0f6d7e',
          800: '#125868',
          900: '#164a58',
          950: '#0a2e39',
        },
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
