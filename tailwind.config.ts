import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfaf5',
          100: '#d3f3e6',
          200: '#aae6d0',
          300: '#72d2b3',
          400: '#3ab690',
          500: '#1a9d75',
          600: '#0e7f5e',
          700: '#0c664d',
          800: '#0b513d',
          900: '#0a4333',
        },
        dark: {
          50:  '#f6f7f9',
          100: '#eceef2',
          200: '#d4d9e3',
          300: '#adb6c8',
          400: '#8090aa',
          500: '#5f7090',
          600: '#4b5a77',
          700: '#3d4a61',
          800: '#344052',
          900: '#1a2030',
          950: '#0f1520',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
