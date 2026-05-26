import { AxiosError } from 'axios';
import { RmsScope, Role, type Site, type SiteStatus } from '@/types';

export const formatEnum = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const rmsScopeLabel = (scope: RmsScope): string => {
  switch (scope) {
    case RmsScope.RMS: return 'RMS';
    case RmsScope.SMART_LOCK: return 'Smart Lock';
    case RmsScope.SMART_METER: return 'Smart Meter';
    case RmsScope.RMS_SERVICE: return 'RMS Service';
    default: return String(scope);
  }
};

export const roleLabel = (role: Role): string => {
  switch (role) {
    case Role.ADMIN: return 'Admin';
    case Role.MANAGER: return 'Manager';
    case Role.TECHNICIAN: return 'Technician';
    default: return String(role);
  }
};

export const apiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (error instanceof AxiosError) {
    const data: any = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message) && data.message.length > 0) return data.message.join(', ');
    if (typeof data?.error === 'string') return data.error;
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

// Five status milestones in their canonical display order.
export const STATUS_STEPS: Array<{
  key: keyof SiteStatus;
  label: string;
}> = [
  { key: 'created', label: 'Created' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'reviewed', label: 'Reviewed' },
];

// "Current stage" — the deepest milestone that's still done.
export const currentStage = (site: Site): string => {
  const order: Array<keyof SiteStatus> = [
    'created',
    'assigned',
    'processing',
    'completed',
    'reviewed',
  ];
  let last: string = 'created';
  for (const k of order) {
    if (site.status?.[k]?.done) last = k;
  }
  return last;
};

export const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
};

export const formatDateTime = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
};
