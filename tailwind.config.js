export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        quaternary: 'var(--color-quaternary)',//useing primary text color
        quinary: 'var(--color-quinary)',//using as secondary text color
        'blue-600': 'var(--color-blue-600)',
        'gray-500': 'var(--color-gray-500)',
        'yellow-300': 'var(--color-yellow-300)',
        'yellow-500': 'var(--color-yellow-500)',
        'yellow-100': 'var(--color-yellow-100)',
        'yellow-900': 'var(--color-yellow-900)',
        'surface-low': 'var(--color-surface-low)',
        'disabled': 'var(--color-disabled)',
        senary: 'var(--color-senary)',
        text: 'var(--color-text)',
      }
    },
  },
  plugins: [],
}