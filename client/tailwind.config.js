/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070a0f',
          900: '#0b0f17',
          850: '#0f1724',
          800: '#141d2e',
          700: '#1c283e',
          600: '#273854',
        },
        mc: {
          green: '#10b981',
          gold: '#f59e0b',
          red: '#ef4444',
          cyan: '#06b6d4',
          dirt: '#855637',
          obsidian: '#19142e',
          diamond: '#4dedf4',
        },
        playit: {
          blue: '#0284c7',
          accent: '#38bdf8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
};
