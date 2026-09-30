import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  // darkMode: ['class'] — activar en V2 cuando se implemente dark mode
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../shared/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Paleta corporativa GymSync + mappings shadcn/ui para clases @apply
      // Fuente: doc identidad visual — paleta corporativa
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        navy: {
          DEFAULT: '#0D1B3E',
          50: '#E8EBF2',
          100: '#C5CCDE',
          500: '#0D1B3E',
          600: '#0A1630',
          700: '#071122',
        },
        electric: {
          DEFAULT: '#1A73E8',
          50: '#EBF3FE',
          100: '#C5DCFB',
          500: '#1A73E8',
          600: '#155EBB',
          700: '#10488E',
        },
        teal: {
          DEFAULT: '#00A896',
          50: '#E6F7F5',
          100: '#B3E8E3',
          500: '#00A896',
          600: '#008678',
          700: '#00645A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      // Animaciones para Framer Motion y tailwindcss-animate
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
