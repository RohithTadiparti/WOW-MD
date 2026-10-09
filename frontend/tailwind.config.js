/** @type {import('tailwindcss').Config} */

/**
 * Every colour resolves to a CSS variable rather than a hex value.
 *
 * That indirection is what makes the dark theme a variable swap instead of a
 * rewrite. The application already contains around a thousand `gray-*`
 * utilities and two hundred `brand-*` ones written before any of this existed;
 * pointing those scales at variables means all of them theme correctly without
 * a single page being touched.
 *
 * The `<alpha-value>` slot matters: it is what keeps `bg-gray-900/60` and
 * `ring-brand/12` working. A variable holding a hex string would break every
 * translucent surface in the app.
 */
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const ramp = (prefix) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
      .filter((step) => step !== 950 || prefix === 'ink')
      .map((step) => [step, channel(`${prefix}-${step}`)]),
  );

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: ramp('ink'),
        ink: ramp('ink'),

        brand: {
          ...ramp('rose'),
          DEFAULT: channel('brand'),
          rose: channel('rose-500'),
          strong: channel('brand-strong'),
          soft: channel('brand-soft'),
          fg: channel('brand-fg'),
          dark: channel('brand-strong'),
          light: channel('brand-soft'),
        },

        gold: {
          DEFAULT: channel('gold'),
          lit: channel('gold-lit'),
          deep: channel('gold-deep'),
        },

        canvas: channel('canvas'),
        scrim: channel('scrim'),
        surface: {
          DEFAULT: channel('surface'),
          raised: channel('surface-raised'),
          sunken: channel('surface-sunken'),
        },

        positive: { fg: channel('positive-fg'), bg: channel('positive-bg') },
        info: { fg: channel('info-fg'), bg: channel('info-bg') },
        caution: { fg: channel('caution-fg'), bg: channel('caution-bg') },
        critical: { fg: channel('critical-fg'), bg: channel('critical-bg') },

        red: {
          50: channel('critical-bg'),
          100: channel('critical-bg'),
          600: channel('critical-fg'),
          700: channel('critical-fg'),
          800: channel('critical-fg'),
          900: channel('critical-fg'),
        },
        emerald: {
          50: channel('positive-bg'),
          100: channel('positive-bg'),
          600: channel('positive-fg'),
          700: channel('positive-fg'),
          800: channel('positive-fg'),
          900: channel('positive-fg'),
        },
        green: {
          50: channel('positive-bg'),
          100: channel('positive-bg'),
          600: channel('positive-fg'),
          700: channel('positive-fg'),
          800: channel('positive-fg'),
        },
        amber: {
          50: channel('caution-bg'),
          100: channel('caution-bg'),
          200: channel('caution-bg'),
          600: channel('caution-fg'),
          700: channel('caution-fg'),
          800: channel('caution-fg'),
          900: channel('caution-fg'),
        },
        blue: {
          50: channel('info-bg'),
          700: channel('info-fg'),
          800: channel('info-fg'),
          900: channel('info-fg'),
        },
        sky: {
          50: channel('info-bg'),
          700: channel('info-fg'),
          800: channel('info-fg'),
          900: channel('info-fg'),
        },
        rose: {
          50: channel('brand-soft'),
          100: channel('brand-soft'),
          300: channel('rose-300'),
          500: channel('rose-500'),
          600: channel('rose-600'),
          700: channel('rose-700'),
          800: channel('rose-800'),
        },
        violet: {
          50: channel('info-bg'),
          800: channel('info-fg'),
        },
      },

      borderColor: {
        DEFAULT: 'var(--line)',
        gray: { 100: 'var(--line)', 200: 'var(--line)', 300: 'var(--line-strong)' },
      },

      borderRadius: {
        DEFAULT: 'var(--radius-sm)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-lg)',
        '2xl': 'var(--radius-lg)',
        '3xl': 'var(--radius-lg)',
      },

      boxShadow: {
        btn: '0 1px 3px -1px rgb(var(--shadow-color) / 0.08)',
        card: '0 1px 2px -1px rgb(var(--shadow-color) / 0.06)',
        lifted:
          '0 2px 4px -2px rgb(var(--shadow-color) / 0.08), 0 12px 28px -8px rgb(var(--shadow-color) / 0.12)',
        pop: '0 8px 40px -12px rgb(var(--shadow-color) / 0.22)',
      },

      fontFamily: {
        sans: ['Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Karla', 'Helvetica Neue', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Karla', 'Helvetica Neue', 'ui-sans-serif', 'sans-serif'],
      },

      fontSize: {
        display: ['clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)', { lineHeight: '1.04', letterSpacing: '-0.032em' }],
        hero: ['clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.028em' }],
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      opacity: { 12: '0.12' },

      maxWidth: { content: '1400px' },
    },
  },
  plugins: [],
};
