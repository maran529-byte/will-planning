import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#059669',
        accent: '#F59E0B',
        background: '#F8FAFC',
        foreground: '#1E293B',
      },
    },
  },
  plugins: [],
}

export default config
