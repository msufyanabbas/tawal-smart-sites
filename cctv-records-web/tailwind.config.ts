import type { Config } from 'tailwindcss';

// Brand palette is anchored to the two parent brands:
//   - Tawal:      vivid orange (#FC4C02) on near-black navy
//   - Smart Life: gradient from magenta (#E5358A) through to cyan (#2EB5E3)
// Tawal orange is the primary CTA colour because it's the strongest
// signal in their actual brandmark; Smart Life cyan/magenta drive the
// secondary accents.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1ea',
          100: '#ffdcc6',
          200: '#ffb78a',
          300: '#ff9152',
          400: '#fd6e26',
          500: '#FC4C02', // Tawal primary orange
          600: '#d63d00',
          700: '#a82f00',
          800: '#7b2200',
          900: '#4f1500',
        },
        navy: {
          50: '#f0f3f8',
          100: '#dbe1ec',
          200: '#b6c3d8',
          300: '#8da0bf',
          400: '#5b7299',
          500: '#3a5278',
          600: '#293c5a',
          700: '#1c2c45',
          800: '#101c30',
          900: '#0a1424',
          950: '#050a16',
        },
        accent: {
          cyan: '#2EB5E3',     // Smart Life cyan (bottom of S gradient)
          magenta: '#E5358A',  // Smart Life magenta (top of S gradient)
          violet: '#7B3F9E',   // Smart Life mid-gradient
        },
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #FC4C02 0%, #E5358A 50%, #2EB5E3 100%)',
        'navy-gradient':
          'linear-gradient(180deg, #101c30 0%, #050a16 100%)',
        'smartlife-gradient':
          'linear-gradient(135deg, #E5358A 0%, #7B3F9E 50%, #2EB5E3 100%)',
      },
      boxShadow: {
        brand: '0 8px 24px -8px rgba(252,76,2,0.35)',
        navy: '0 4px 24px -8px rgba(5,10,22,0.45)',
      },
    },
  },
  plugins: [],
} satisfies Config;
