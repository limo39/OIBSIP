/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#141210',
        paper: '#f4efe6',
        cream: '#fbf7f1',
        ember: '#c8102e',
        'ember-deep': '#9b0c22',
        olive: '#0e3b24',
        moss: '#146c43',
        gold: '#c6a15b',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        sheet: '0 24px 60px rgba(28, 20, 16, 0.18)',
      },
    },
  },
  plugins: [],
};
