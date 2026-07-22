/* eslint-disable prettier/prettier */
import {
  cacheDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { recognizeText } from 'expo-mlkit-ocr';

/**
 * ML Kit needs a local file/content URI. Image picker often returns a base64
 * data URI, so write that to cache before running OCR.
 */
async function resolveOcrUri(imageUri: string): Promise<string> {
  if (
    imageUri.startsWith('file://') ||
    imageUri.startsWith('content://') ||
    imageUri.startsWith('/')
  ) {
    return imageUri;
  }

  if (imageUri.startsWith('data:')) {
    const base64 = imageUri.split(',')[1];
    if (!base64) throw new Error('Invalid data URI for OCR');
    const path = `${cacheDirectory}ocr-${Date.now()}.jpg`;
    await writeAsStringAsync(path, base64, {
      encoding: EncodingType.Base64,
    });
    return path;
  }

  return imageUri;
}

/**
 * Run on-device MLKit OCR on a local image URI.
 * Returns all recognised text joined into a single string.
 */
export async function runOcr(imageUri: string): Promise<string> {
  const uri = await resolveOcrUri(imageUri);
  const result = await recognizeText(uri);
  return result.text ?? '';
}

/**
 * Pull the SIM serial (18 digits) from OCR output.
 * SIM cards usually print the ICCID on the last line, often split by a space
 * e.g. "8996601 10006504227" -> 899660110006504227.
 */
export function extractLastEighteenDigitSerial(ocrText: string): string | null {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Scan from the bottom — skip PIN/PUK lines above the ICCID.
  for (let i = lines.length - 1; i >= 0; i--) {
    const lineDigits = lines[i].replace(/\D/g, '');
    if (lineDigits.length === 18) return lineDigits;

    // Serial sometimes wraps onto the previous line.
    if (i > 0) {
      const combinedDigits = (lines[i - 1] + lines[i]).replace(/\D/g, '');
      if (combinedDigits.length === 18) return combinedDigits;
      if (combinedDigits.length > 18) return combinedDigits.slice(-18);
    }
  }

  const allDigits = ocrText.replace(/\D/g, '');
  if (allDigits.length < 18) return null;

  return allDigits.slice(-18);
}

/**
 * Match a scanned serial against the API SIM list (ignores spaces/dashes).
 */
export function matchKnownSimSerial(
  serial: string,
  knownSerials: string[],
): string | null {
  const normalized = serial.replace(/\D/g, '');
  return (
    knownSerials.find((s) => s.replace(/\D/g, '') === normalized) ?? null
  );
}

export type SimSerialScanResult = {
  extracted: string | null;
  matched: string | null;
};

/**
 * Extract the last 18-digit serial from OCR text, then check the SIM list.
 */
export function scanSimSerialFromOcr(
  ocrText: string,
  knownSerials: string[] = [],
): SimSerialScanResult {
  const extracted = extractLastEighteenDigitSerial(ocrText);
  if (!extracted) {
    return { extracted: null, matched: null };
  }

  const matched = matchKnownSimSerial(extracted, knownSerials);
  return { extracted, matched };
}

/** @deprecated Use scanSimSerialFromOcr instead. */
export function extractSimSerial(
  ocrText: string,
  knownSerials: string[] = [],
): string | null {
  return scanSimSerialFromOcr(ocrText, knownSerials).matched;
}
