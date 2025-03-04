/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '2rem',
      },
      width: {
        'layout': '1920px',
      },
      minWidth: {
        'layout': '1920px',
      },
      padding: {
        'layout': '20px',
      },
      colors: {
        primary: '#your-primary-color',
        secondary: '#your-secondary-color',
      }
    },
  },
  plugins: [],
}

