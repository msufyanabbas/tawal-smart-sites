import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const REF_PREFIX = '__B64_REF__:';
const STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'site-images');

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

export function storeBase64Image(dataUrl: string): string {
  ensureStorageDir();
  const hash = crypto.createHash('sha256').update(dataUrl).digest('hex');
  const fileName = `${hash}.b64`;
  const filePath = path.join(STORAGE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, dataUrl, 'utf8');
  }
  return `${REF_PREFIX}${fileName}`;
}

export function resolveStoredImage(value?: string): string {
  if (!value || typeof value !== 'string') return value ?? '';
  if (!value.startsWith(REF_PREFIX)) return value;
  const fileName = path.basename(value.slice(REF_PREFIX.length));
  const filePath = path.join(STORAGE_DIR, fileName);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch {
    // Ignore read error and return empty string
  }
  return '';
}

function walkAndTransformStrings(
  node: any,
  transform: (str: string) => string,
): any {
  if (typeof node === 'string') {
    return transform(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => walkAndTransformStrings(item, transform));
  }
  if (
    node &&
    typeof node === 'object' &&
    !(node instanceof Date) &&
    !Buffer.isBuffer(node) &&
    node.constructor?.name !== 'ObjectId'
  ) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = walkAndTransformStrings(v, transform);
    }
    return out;
  }
  return node;
}

/**
 * Externalizes base64 data:image strings larger than `thresholdBytes` to disk
 * so that the MongoDB BSON document never exceeds the 16 MB BSON limit.
 */
export function externalizeLargeImages<T>(
  payload: T,
  thresholdBytes = 100 * 1024,
): T {
  return walkAndTransformStrings(payload, (str) => {
    if (str.startsWith('data:image/') && str.length > thresholdBytes) {
      return storeBase64Image(str);
    }
    return str;
  });
}

/**
 * Restores any externalized `__B64_REF__:<hash>.b64` strings back to their
 * original `data:image/...` data URLs when sending a site document to clients.
 */
export function hydrateExternalizedImages<T>(payload: T): T {
  return walkAndTransformStrings(payload, (str) => {
    if (str.startsWith(REF_PREFIX)) {
      return resolveStoredImage(str);
    }
    return str;
  });
}
