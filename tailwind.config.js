/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#8B5CF6',
        },
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#181c20',
        surface: '#1F2937',
        'surface-light': '#374151',
        text: '#FFFFFF',
        'text-muted': '#9CA3AF',
        border: '#4B5563',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

