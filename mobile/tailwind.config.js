/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: scan every screen + component file for classnames.
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // App is hard-locked to dark mode (see app.json `userInterfaceStyle`), so we
  // opt out of NativeWind's media-query dark mode (which can't be set
  // programmatically and was logging a warning at startup).
  darkMode: 'class',
  theme: {
    extend: {
      // Mirror the website's aurora design tokens so the two clients feel
      // like one product. HSL is kept consistent with website/src/app/globals.css.
      colors: {
        background: '#08070d',
        foreground: '#f3f4f8',
        muted: '#1a1922',
        'muted-foreground': '#9b9ba8',
        card: 'rgba(20,19,28,0.78)',
        border: 'rgba(255,255,255,0.08)',
        primary: {
          DEFAULT: '#7c5cff',
          foreground: '#0a0612',
        },
        secondary: {
          DEFAULT: '#22d3ee',
          foreground: '#04181c',
        },
        accent: {
          DEFAULT: '#f472b6',
          foreground: '#1d0810',
        },
        success: '#34d399',
        warning: '#facc15',
        destructive: '#f87171',
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'system-ui', 'sans-serif'],
        display: ['Sora_600SemiBold', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
};
