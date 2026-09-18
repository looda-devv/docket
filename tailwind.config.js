/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Manila and carbon: a case file, not a dashboard.
        ink: { 950: '#0a0a0b', 900: '#101012', 850: '#16161a', 800: '#1d1d22', 700: '#2a2a31' },
        bone: { 100: '#f2efe9', 200: '#ddd8ce', 300: '#b9b3a7', 400: '#8c867a', 500: '#6b665c' },
        // The file tab.
        tab: { 200: '#ffd9a0', 300: '#ffc46b', 400: '#f5a623', 500: '#d98613' },
        // Violent crime.
        blood: { 200: '#ffb3ae', 300: '#ff7a72', 400: '#ef4444', 500: '#c62f2f' },
        // A fall in crime.
        fall: { 300: '#7ee0a8', 400: '#3fbf76', 500: '#2a9d5c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
