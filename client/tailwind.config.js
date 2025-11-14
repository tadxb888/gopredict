/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00A2FF',
          dark: '#0088CC'
        },
        background: {
          DEFAULT: '#21222C',
          light: '#2A2B36'
        },
        success: {
          DEFAULT: '#50F178',
          light: '#68FF8E'
        },
        border: {
          DEFAULT: '#429356'
        },
        text: {
          DEFAULT: '#50F178',
          light: '#68FF8E',
          muted: '#8B8B8B'
        }
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
