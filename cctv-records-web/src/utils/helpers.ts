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
    case RmsScope.SIM_SWAP: return 'SIM Swap';
    case RmsScope.CCTV: return 'CCTV';
    case RmsScope.LEGACY_POO_METER: return 'Legacy (POO) Meter';
    case RmsScope.COLLOCATION_METER: return 'Collocation Meter';
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

export const compressDataUrlImage = (
  dataUrl: string,
  maxDimension = 1024,
  quality = 0.6,
): Promise<string> =>
  new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // Fill white background before drawing so transparent PNGs don't turn black in JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = async () => {
      const raw = reader.result as string;
      const compressed = await compressDataUrlImage(raw);
      resolve(compressed);
    };
    reader.readAsDataURL(file);
  });

export const compressPayloadImages = async <T>(
  node: T,
  thresholdBytes = 120 * 1024,
): Promise<T> => {
  if (typeof node === 'string') {
    if (node.startsWith('data:image/') && node.length > thresholdBytes) {
      return (await compressDataUrlImage(node)) as unknown as T;
    }
    return node;
  }
  if (Array.isArray(node)) {
    const out = await Promise.all(
      node.map((item) => compressPayloadImages(item, thresholdBytes)),
    );
    return out as unknown as T;
  }
  if (node && typeof node === 'object') {
    const entries = await Promise.all(
      Object.entries(node as Record<string, unknown>).map(async ([k, v]) => [
        k,
        await compressPayloadImages(v, thresholdBytes),
      ]),
    );
    return Object.fromEntries(entries) as T;
  }
  return node;
};

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
