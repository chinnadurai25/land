/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '800px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        ivory: '#FAF9F5',
        forest: {
          DEFAULT: '#245B45',
          hover: '#173E2F',
          dark: '#1F3229',
          footer: '#183D2E',
        },
        sage: {
          DEFAULT: '#EEF1E8',
          soft: '#E8EEE3',
          border: '#D5DFD1',
        },
        limeaccent: '#C8DC9F',
        muted: '#666666',
        amberwarn: {
          bg: '#FDF6EA',
          border: '#D9A75A',
          text: '#7A4E10',
        },
      },
      fontFamily: {
        sans: ['Verdana', 'sans-serif'],
      },
      borderRadius: {
        card: '28px',
        photo: '20px',
        hero: '40px',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(24, 61, 46, 0.12)',
        elevated: '0 20px 44px -14px rgba(24, 61, 46, 0.2)',
      },
    },
  },
  plugins: [],
};
