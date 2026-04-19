/**
 * Design tokens for the mobile app. Kept in sync with the website's
 * `globals.css` so the two clients feel like one product.
 *
 * NativeWind handles classnames at the JSX layer, but anywhere we have to
 * pass a real color value (gradients, shadows, status bar) we pull from here.
 */

export const colors = {
  background: '#08070d',
  surface: '#14131c',
  surfaceMuted: '#1a1922',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  foreground: '#f3f4f8',
  mutedForeground: '#9b9ba8',
  primary: '#7c5cff',
  primaryDeep: '#5b3ee0',
  secondary: '#22d3ee',
  accent: '#f472b6',
  success: '#34d399',
  warning: '#facc15',
  destructive: '#f87171',
} as const;

export const auroraGradient: [string, string, string] = [
  '#3a1d6b',
  '#1b1633',
  '#08070d',
];

export const buttonGradient: [string, string] = ['#7c5cff', '#22d3ee'];

export const accentGradient: [string, string] = ['#f472b6', '#7c5cff'];
