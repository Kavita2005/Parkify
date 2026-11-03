/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
    colors: {
      base: '#050b17', surface: '#0a1428', raised: '#101d3a', line: '#192b50', line2: '#27427a',
      ink: '#f2f6ff', soft: '#c5d0ea', mute: '#8c9bbd', dim: '#5f6f93',
      brand: { 50: '#eaf2ff', 100: '#d6e6ff', 200: '#b0cdff', 300: '#82afff', 500: '#3d8bff', 600: '#1a6dff', 700: '#1259d6', 900: '#0a2a6b' },
    },
    boxShadow: { lift: '0 18px 40px -16px rgba(0,0,0,.85)' },
  } },
  plugins: [],
}
