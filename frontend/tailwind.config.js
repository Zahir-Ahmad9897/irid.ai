/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Ink & Brass surfaces ──
        background: 'var(--bg-color)',
        'surface-base': 'var(--surface-base)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-card': 'var(--surface-card)',
        'surface-hover': 'var(--surface-hover)',
        'on-surface': 'var(--on-surface)',
        'on-surface-variant': 'var(--on-surface-variant)',
        'on-surface-muted': 'var(--on-surface-muted)',

        // ── Borders ──
        'glass-border': 'var(--border-subtle)', // Kept variable name for compat with hardcoded classes if any, though we'll remove them
        'border-subtle': 'var(--border-subtle)',
        'border-hover': 'var(--border-hover)',

        // ── Primary (Brass) ──
        primary: 'var(--accent-brass)',
        'on-primary': 'var(--bg-color)',
        'primary-soft': 'var(--accent-brass-soft)',

        // ── Status ──
        'status-success': 'var(--status-success)',
        'status-success-bg': 'var(--status-success-bg)',
        'status-success-border': 'var(--status-success-border)',
        'status-error': 'var(--status-error)',
        'status-error-bg': 'var(--status-error-bg)',
        'status-error-border': 'var(--status-error-border)',
        'status-warning': 'var(--status-warning)',
        'status-warning-bg': 'var(--status-warning-bg)',
        'status-info': 'var(--status-info)',
        'status-info-bg': 'var(--status-info-bg)',
        'status-info-border': 'var(--status-info-border)',

        // ── Sidebar ──
        'sidebar-bg': 'var(--surface-elevated)',
        'sidebar-active': 'var(--surface-hover)',
        'sidebar-active-border': 'var(--accent-brass)',
      },
      fontSize: {
        // Removed letter-spacing overrides for a cleaner, non-techy look
        'display-lg': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'headline-lg': ['30px', { lineHeight: '38px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        'container-max': '1280px',
        gutter: '24px',
      },
      boxShadow: {
        'level-1': 'none',
        'level-2': 'var(--shadow-level-2)',
        'level-3': 'var(--shadow-level-3)',
      },
    },
  },
  plugins: [],
}