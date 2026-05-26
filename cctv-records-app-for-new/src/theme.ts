// Centralized design tokens — mirrors the web app's tailwind palette so the
// two apps feel like the same product. Always import from this file rather
// than typing hex codes directly in screens.

import type { Role, RmsScope, SiteStatus } from './types';

export const colors = {
  // Tawal primary (orange)
  brand: '#FC4C02',
  brandDark: '#D63D00',
  brandLight: '#FFF1EA',
  brandSubtle: '#FFDCC6',

  // Navy navbar / hero
  navy: '#1B2A47',
  navyDeep: '#0F1A2E',
  navyMid: '#293C5A',
  navyMuted: '#5B7299',

  // Smart Life accents
  cyan: '#00BCD4',
  cyanLight: '#E0F7FA',
  magenta: '#E5358A',
  violet: '#7B3F9E',

  // Neutrals
  bg: '#F4F6FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  inputBg: '#FFFFFF',

  // Text
  text: '#1B2A47',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.72)',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  body: 14,
  lg: 16,
  xl: 18,
  h2: 20,
  h1: 24,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F1A2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  brand: {
    shadowColor: colors.brand,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

// ── Semantic palette helpers ───────────────────────────────────────────────

export const statusColor: Record<keyof SiteStatus, string> = {
  created: colors.navy,
  assigned: colors.cyan,
  processing: colors.warning,
  completed: colors.success,
  reviewed: colors.violet,
};

export const scopeColor: Record<RmsScope, string> = {
  RMS: '#2563EB',           // blue
  SMART_LOCK: colors.brand, // orange
  SMART_METER: colors.success, // green
  RMS_SERVICE: colors.violet,  // purple
};

export const roleColor: Record<Role, string> = {
  admin: colors.brand,
  manager: colors.cyan,
  technician: colors.violet,
};
