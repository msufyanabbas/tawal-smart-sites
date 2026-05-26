import { Role, RmsScope, Site, SiteStatus } from '../types';

// ── Derived counts (mirrors web's utils/siteSchema.ts) ─────────────────────
//
// One smart meter serves up to three tenants — round up so partial groups
// still get a meter (e.g. 1 tenant still gets 1 meter, 4 tenants get 2).
// CT splits stay 3×tenants. Silbo gateways and SIM cards are fixed-1 for
// SMART_METER (one per site, plus its SIM).
export const smartMetersFor = (tenants: number): number => {
  if (tenants <= 0) return 0;
  return Math.ceil(tenants / 3);
};

export interface DerivedCounts {
  smartMeters: number;
  ctSplits: number;
  silboGateways: number;
  sims: number;
}

export const deriveCounts = (
  scope: RmsScope | '' | undefined,
  tenants: number,
): DerivedCounts => ({
  smartMeters: smartMetersFor(tenants),
  ctSplits: tenants * 3,
  silboGateways: scope === RmsScope.SMART_METER ? 1 : 0,
  sims: scope === RmsScope.SMART_METER ? 1 : 0,
});

export const formatDate = (date?: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const formatDateTime = (date?: Date | string): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const isNonEmptyString = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim() !== '';

export const generateUniqueId = (): string =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) {
    const m = error.response.data.message;
    return Array.isArray(m) ? m.join(', ') : String(m);
  }
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};

const formatEnum = (v: string): string =>
  v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const rmsScopeLabel = (s: RmsScope): string => {
  switch (s) {
    case RmsScope.RMS: return 'RMS';
    case RmsScope.SMART_LOCK: return 'Smart Lock';
    case RmsScope.SMART_METER: return 'Smart Meter';
    case RmsScope.RMS_SERVICE: return 'RMS Service';
    default: return String(s);
  }
};

export const roleLabel = (r: Role): string => {
  switch (r) {
    case Role.ADMIN: return 'Admin';
    case Role.MANAGER: return 'Manager';
    case Role.TECHNICIAN: return 'Technician';
    default: return String(r);
  }
};

export const STATUS_STEPS: Array<{ key: keyof SiteStatus; label: string }> = [
  { key: 'created', label: 'Created' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'reviewed', label: 'Reviewed' },
];

export const isNumericString = (v: string): boolean => /^\d+$/.test(v.trim());

export const currentStage = (site: Site): string => {
  const order: Array<keyof SiteStatus> = [
    'created', 'assigned', 'processing', 'completed', 'reviewed',
  ];
  let last: string = 'created';
  for (const k of order) {
    if (site.status?.[k]?.done) last = k;
  }
  return last;
};
