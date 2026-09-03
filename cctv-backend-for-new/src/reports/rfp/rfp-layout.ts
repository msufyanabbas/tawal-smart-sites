/* eslint-disable prettier/prettier */
import type PptxGenJS from 'pptxgenjs';
import { SMART_LIFE_LOGO } from './rfp-assets';
import { COLORS, FONT, PANEL_W, SIZE, SLIDE_H, SLIDE_W, STRIPE } from './rfp-theme';

/** Convenience alias — `Slide` lives on the pptxgenjs namespace. */
export type PptxSlide = PptxGenJS.Slide;

/**
 * Reusable slide chrome. Every helper here draws template furniture only —
 * backgrounds, panels, logos, image frames — so the slide builders in
 * rfp-report.service.ts stay readable.
 */

/** Strip a `data:` URI prefix; pptxgenjs wants `image/jpeg;base64,...`. */
export const toPptxImageData = (value?: string): string | null => {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('data:')) {
    const payload = v.slice(5);
    // Guard against a truncated/garbled value reaching pptxgenjs, which would
    // otherwise produce a deck PowerPoint refuses to open.
    return payload.includes(';base64,') ? payload : null;
  }
  // Bare base64 with no mime — assume JPEG, which is what the app captures.
  if (/^[A-Za-z0-9+/=\s]+$/.test(v) && v.length > 64) {
    return `image/jpeg;base64,${v.replace(/\s/g, '')}`;
  }
  return null;
};

/** Flat page background in the template's off-white. */
export const addBackground = (slide: PptxSlide): void => {
  slide.background = { color: COLORS.bg };
};

/**
 * The dark side panel with the cyan/magenta/purple stripe down its edge —
 * the deck's repeating motif, used on section and closing slides.
 */
export const addSidePanel = (slide: PptxSlide, width = PANEL_W): void => {
  slide.addShape('rect', {
    x: 0, y: 0, w: width, h: SLIDE_H,
    fill: { color: COLORS.ink }, line: { type: 'none' },
  });
  let x = width;
  slide.addShape('rect', { x, y: 0, w: STRIPE.cyan, h: SLIDE_H, fill: { color: COLORS.cyan }, line: { type: 'none' } });
  x += STRIPE.cyan;
  slide.addShape('rect', { x, y: 0, w: STRIPE.magenta, h: SLIDE_H, fill: { color: COLORS.magenta }, line: { type: 'none' } });
  x += STRIPE.magenta;
  slide.addShape('rect', { x, y: 0, w: STRIPE.purple, h: SLIDE_H, fill: { color: COLORS.purple }, line: { type: 'none' } });
};

/** The Smart Life mark in its white disc, as it sits on every panelled slide. */
export const addLogoBadge = (
  slide: PptxSlide,
  x: number,
  y: number,
  size = 1.25,
): void => {
  slide.addShape('ellipse', {
    x, y, w: size, h: size,
    fill: { color: COLORS.white }, line: { type: 'none' },
  });
  const inner = size * 0.54;
  slide.addImage({
    data: SMART_LIFE_LOGO,
    x: x + (size - inner) / 2,
    y: y + (size - inner * 0.8) / 2,
    w: inner,
    h: inner * 0.8,
  });
};

/**
 * A framed photo slot. Draws the card, fits the image inside it preserving
 * aspect ratio, and falls back to a "no photo" plate when the technician did
 * not capture one — so a missing image never leaves a hole in the deck.
 */
export const addPhotoFrame = (
  slide: PptxSlide,
  opts: {
    data?: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
    caption?: string;
    emptyText?: string;
  },
): void => {
  const { data, x, y, w, h, caption, emptyText } = opts;

  slide.addShape('roundRect', {
    x, y, w, h,
    rectRadius: 0.06,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 0.75 },
    shadow: { type: 'outer', color: '94A3B8', blur: 8, offset: 2, angle: 90, opacity: 0.18 },
  });

  const capH = caption ? 0.32 : 0;
  const pad = 0.14;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2 - capH;

  if (data) {
    slide.addImage({
      data,
      x: innerX,
      y: innerY,
      w: innerW,
      h: innerH,
      sizing: { type: 'contain', w: innerW, h: innerH },
    });
  } else {
    slide.addShape('roundRect', {
      x: innerX, y: innerY, w: innerW, h: innerH,
      rectRadius: 0.04,
      fill: { color: 'EEF2F7' },
      line: { type: 'none' },
    });
    slide.addText(emptyText || 'No photo captured', {
      x: innerX, y: innerY + innerH / 2 - 0.16, w: innerW, h: 0.32,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.faint,
      align: 'center', valign: 'middle',
    });
  }

  if (caption) {
    slide.addText(caption, {
      x: innerX, y: y + h - pad - capH + 0.02, w: innerW, h: capH,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.muted,
      align: 'center', valign: 'middle',
    });
  }
};

/**
 * Slide header for the light content pages: eyebrow label on the left, page
 * context on the right, with a hairline beneath.
 */
export const addContentHeader = (
  slide: PptxSlide,
  title: string,
  context?: string,
): void => {
  slide.addText(title, {
    x: 0.62, y: 0.42, w: 8.0, h: 0.44,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: SIZE.cardTitle, bold: true, color: COLORS.slate,
    valign: 'middle',
  });
  if (context) {
    slide.addText(context, {
      x: 8.7, y: 0.42, w: 4.0, h: 0.44,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.muted,
      align: 'right', valign: 'middle',
    });
  }
  slide.addShape('rect', {
    x: 0.62, y: 0.96, w: SLIDE_W - 1.24, h: 0.014,
    fill: { color: COLORS.border }, line: { type: 'none' },
  });
};

/** Confidentiality footer, matching the cover's wording. */
export const addFooter = (slide: PptxSlide, right?: string): void => {
  slide.addText('Confidential - Internal Use Only', {
    x: 0.62, y: 7.02, w: 4.0, h: 0.24,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: SIZE.caption, color: COLORS.faint, valign: 'middle',
  });
  if (right) {
    slide.addText(right, {
      x: SLIDE_W - 4.62, y: 7.02, w: 4.0, h: 0.24,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.caption, color: COLORS.faint,
      align: 'right', valign: 'middle',
    });
  }
};

/** A small labelled value block — the cover's stat columns and detail grids. */
export const addStat = (
  slide: PptxSlide,
  opts: { x: number; y: number; w: number; label: string; value: string; color?: string; align?: 'left' | 'center' },
): void => {
  const align = opts.align ?? 'center';
  slide.addText(opts.value || '—', {
    x: opts.x, y: opts.y, w: opts.w, h: 0.42,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: SIZE.statValue, bold: true,
    color: opts.color ?? COLORS.coverBlue,
    align, valign: 'middle',
  });
  slide.addText(opts.label, {
    x: opts.x, y: opts.y + 0.44, w: opts.w, h: 0.22,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: SIZE.caption, color: COLORS.muted,
    align, valign: 'middle',
  });
};
