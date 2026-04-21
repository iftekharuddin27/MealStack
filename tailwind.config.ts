// ============================================================
// MealStack · Tailwind CSS Configuration
// ============================================================

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia'],
        mono:  ['var(--font-mono)', 'ui-monospace', 'monospace'],
        head:  ['var(--font-serif)', 'ui-serif'],
      },
      colors: {
        background: {
          DEFAULT: 'hsl(var(--background))',
          2:       'hsl(var(--background-2))',
          3:       'hsl(var(--background-3))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          2:       'hsl(var(--surface-2))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          2:       'hsl(var(--border-2))',
        },
        foreground: 'hsl(var(--foreground))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        subtle:  'hsl(var(--subtle))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover:   'hsl(var(--accent-hover))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
