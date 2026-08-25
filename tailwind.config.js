/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pwc: {
          primary: 'rgba(var(--color-primary), <alpha-value>)',
          'btn-orange': 'rgba(var(--color-btn-orange), <alpha-value>)',
          'hover-orange': 'rgba(var(--color-hover-orange), <alpha-value>)',
          sidebar: 'rgba(var(--color-sidebar), <alpha-value>)',
          bg: 'rgba(var(--color-bg), <alpha-value>)',
          input: 'rgba(var(--color-input), <alpha-value>)',
          border: 'rgba(var(--color-border), <alpha-value>)',
          'border-orange': 'rgba(var(--color-border-orange), <alpha-value>)',
          text: 'rgba(var(--color-text), <alpha-value>)',
          'text-muted': 'rgba(var(--color-text-muted), <alpha-value>)',
          placeholder: 'rgba(var(--color-placeholder), <alpha-value>)',
          white: 'rgba(var(--color-white), <alpha-value>)',
        },
      },
      fontFamily: {
        sans:     ['DM Sans', 'sans-serif'],
        display:  ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
