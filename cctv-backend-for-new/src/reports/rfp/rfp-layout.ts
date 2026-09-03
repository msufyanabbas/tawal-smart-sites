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

/**
 * Pixel dimensions of a base64 image, read straight out of its header.
 *
 * We need these because pptxgenjs's `sizing: { type: 'contain' }` does not
 * reliably preserve the aspect ratio — images end up stretched to whatever
 * w/h the shape was given. Since the technician's photos are portrait and many
 * of our frames are landscape (or the reverse), letting that happen visibly
 * distorts equipment and makes tag numbers hard to read. Measuring here lets
 * addFittedImage() place an exactly-proportioned rectangle instead.
 *
 * Only the first few KB are decoded — enough to reach the size fields.
 */
export const imageSize = (
  data: string,
): { w: number; h: number } | null => {
  try {
    const comma = data.indexOf(';base64,');
    if (comma < 0) return null;
    const head = Buffer.from(data.slice(comma + 8, comma + 8 + 8192), 'base64');

    // PNG: 8-byte signature, then the IHDR chunk carries width/height.
    if (
      head.length > 24 &&
      head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
    ) {
      return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    }

    // JPEG: walk the segment chain to the start-of-frame marker.
    if (head.length > 4 && head[0] === 0xff && head[1] === 0xd8) {
      let i = 2;
      while (i + 9 < head.length) {
        if (head[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = head[i + 1];
        // SOF0-3, SOF5-7, SOF9-11, SOF13-15 all carry the frame dimensions.
        // C4/C8/CC are DHT/JPG/DAC and must be skipped, not read.
        const isSof =
          marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) {
          return { h: head.readUInt16BE(i + 5), w: head.readUInt16BE(i + 7) };
        }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        i += 2 + head.readUInt16BE(i + 2);
      }
    }
  } catch {
    // A malformed header is not worth failing a whole report over — fall back
    // to filling the box.
  }
  return null;
};

/**
 * Place an image inside a box at its true aspect ratio, centred, never
 * upscaled past the box. Falls back to filling the box if the dimensions
 * could not be read.
 */
export const addFittedImage = (
  slide: PptxSlide,
  opts: { data: string; x: number; y: number; w: number; h: number },
): void => {
  const { data, x, y, w, h } = opts;
  const size = imageSize(data);
  if (!size || !size.w || !size.h) {
    slide.addImage({ data, x, y, w, h });
    return;
  }
  const scale = Math.min(w / size.w, h / size.h);
  const dw = size.w * scale;
  const dh = size.h * scale;
  slide.addImage({
    data,
    x: x + (w - dw) / 2,
    y: y + (h - dh) / 2,
    w: dw,
    h: dh,
  });
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
    addFittedImage(slide, { data, x: innerX, y: innerY, w: innerW, h: innerH });
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

// ── Per-category grid ──────────────────────────────────────────────────────

/** The content box every category grid is laid out inside. */
export const GRID = { x: 0.62, y: 1.15, w: SLIDE_W - 1.24, h: 5.62 } as const;

/** Most units we place on one page before spilling onto a second. */
export const MAX_PER_PAGE = 9;

/**
 * Choose a column/row split for `count` cards so the cards stay as large as
 * possible: a single unit fills the page, three sit in one row, nine go 3x3.
 */
export const gridShape = (count: number): { cols: number; rows: number } => {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  return { cols: 3, rows: 3 };
};

/**
 * Full geometry for a page of `count` unit cards: how many columns, how big
 * each card is, and where the block starts.
 *
 * Card height is capped rather than stretched to fill the page. A row of three
 * cards has room for 5.6in of height but only needs about 3.7in of content, and
 * a card stretched to the former is mostly white space. Capping and then
 * centring the block vertically keeps the page balanced at any unit count.
 */
export const gridLayout = (
  count: number,
): { cols: number; cardW: number; cardH: number; originX: number; originY: number; gap: number } => {
  const { cols } = gridShape(count);
  const gap = 0.22;
  const usedRows = Math.max(1, Math.ceil(count / cols));
  const cardW = (GRID.w - gap * (cols - 1)) / cols;
  const rowH = (GRID.h - gap * (usedRows - 1)) / usedRows;
  // A lone card gets more room; anything in a multi-column grid is bounded by
  // what its two photo slots plus captions actually need.
  const maxCardH = cols === 1 && usedRows === 1 ? 4.7 : 3.9;
  const cardH = Math.min(rowH, maxCardH);
  const blockH = usedRows * cardH + gap * (usedRows - 1);
  return {
    cols,
    cardW,
    cardH,
    gap,
    originX: GRID.x,
    originY: GRID.y + Math.max(0, (GRID.h - blockH) / 2),
  };
};

/** Bare photo slot with no card of its own — used inside a unit card. */
const addInnerPhoto = (
  slide: PptxSlide,
  opts: { data?: string | null; x: number; y: number; w: number; h: number; fontSize: number },
): void => {
  const { data, x, y, w, h, fontSize } = opts;
  if (data) {
    addFittedImage(slide, { data, x, y, w, h });
    return;
  }
  slide.addShape('roundRect', {
    x, y, w, h,
    rectRadius: 0.04,
    fill: { color: 'EEF2F7' }, line: { type: 'none' },
  });
  slide.addText('No photo', {
    x, y: y + h / 2 - 0.14, w, h: 0.28,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize, color: COLORS.faint,
    align: 'center', valign: 'middle',
  });
};

/** A labelled value under a photo — "SERIAL" over the number itself. */
const addPhotoCaption = (
  slide: PptxSlide,
  opts: { x: number; y: number; w: number; h: number; label: string; value?: string; accent: string; scale: number },
): void => {
  const { x, y, w, h, label, value, accent, scale } = opts;
  slide.addText(label.toUpperCase(), {
    x, y, w, h: h * 0.42,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: Math.max(6, 7 * scale), bold: true,
    color: accent, charSpacing: 0.5,
    align: 'center', valign: 'middle',
  });
  slide.addText(value?.trim() || 'Not recorded', {
    x, y: y + h * 0.4, w, h: h * 0.6,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: Math.max(7, 10 * scale), bold: true,
    color: value?.trim() ? COLORS.slate : COLORS.faint,
    align: 'center', valign: 'middle', shrinkText: true,
  });
};

/**
 * One unit rendered as a card: its photo (and asset-tag photo, where the type
 * carries a tag) with the serial and tag numbers captioned underneath.
 *
 * Type sizes scale with the card so a lone smart meter filling the page reads
 * at full size while nine CT splits in a 3x3 stay legible.
 */
export const addUnitCard = (
  slide: PptxSlide,
  opts: {
    x: number; y: number; w: number; h: number;
    title: string;
    serialImage?: string | null;
    tagImage?: string | null;
    serialNumber?: string;
    tagNumber?: string;
    hasTag: boolean;
    serialLabel?: string;
    tagLabel?: string;
  },
): void => {
  const { x, y, w, h, title, hasTag } = opts;
  // 1.0 at a full-page card, ~0.55 in a 3x3 cell.
  const scale = Math.max(0.55, Math.min(1, h / 3.2));
  const pad = 0.1 + 0.06 * scale;
  const titleH = 0.2 + 0.12 * scale;
  const capH = 0.34 + 0.16 * scale;

  slide.addShape('roundRect', {
    x, y, w, h,
    rectRadius: 0.05,
    fill: { color: COLORS.white },
    line: { color: COLORS.border, width: 0.75 },
  });
  slide.addShape('rect', {
    x, y: y + pad, w: 0.05, h: titleH,
    fill: { color: COLORS.cyan }, line: { type: 'none' },
  });
  slide.addText(title, {
    x: x + pad + 0.06, y: y + pad, w: w - pad * 2 - 0.06, h: titleH,
    isTextBox: true, margin: 0,
    fontFace: FONT, fontSize: Math.max(8, 14 * scale), bold: true, color: COLORS.slate,
    valign: 'middle',
  });

  const photoTop = y + pad + titleH + 0.05;
  const availH = h - pad * 2 - titleH - capH - 0.05;
  const emptyFont = Math.max(6, 9 * scale);

  // In a dense grid there is little height to spare, and a portrait photo in a
  // wide slot wastes most of its width. Below this threshold the caption moves
  // beside the photo instead of under it, which lets the photo use the card's
  // full remaining height.
  const compact = h < 2.3;

  if (compact) {
    const innerH = h - pad * 2 - titleH - 0.04;
    const innerY = y + pad + titleH + 0.04;
    const halfW = hasTag ? (w - pad * 3) / 2 : w - pad * 2;
    const cells: Array<{ x: number; img?: string | null; label: string; value?: string; accent: string }> = [
      {
        x: x + pad,
        img: opts.serialImage,
        label: opts.serialLabel ?? 'Serial',
        value: opts.serialNumber,
        accent: COLORS.cyan,
      },
    ];
    if (hasTag) {
      cells.push({
        x: x + pad * 2 + halfW,
        img: opts.tagImage,
        label: opts.tagLabel ?? 'Tag',
        value: opts.tagNumber,
        accent: COLORS.magenta,
      });
    }
    for (const cell of cells) {
      // Leave the identifier enough width that a full tag number stays on
      // one line — wrapping mid-code is what makes these hard to read.
      const pw = Math.min(halfW * 0.40, innerH * 0.74);
      addInnerPhoto(slide, { data: cell.img, x: cell.x, y: innerY, w: pw, h: innerH, fontSize: emptyFont });
      const tx = cell.x + pw + 0.06;
      const tw = halfW - pw - 0.06;
      slide.addText(cell.label.toUpperCase(), {
        x: tx, y: innerY + innerH / 2 - 0.28, w: tw, h: 0.22,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 7, bold: true, color: cell.accent,
        charSpacing: 0.5, valign: 'middle',
      });
      slide.addText(cell.value?.trim() || 'Not recorded', {
        x: tx, y: innerY + innerH / 2 - 0.06, w: tw, h: 0.34,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 8, bold: true,
        color: cell.value?.trim() ? COLORS.slate : COLORS.faint,
        valign: 'middle', shrinkText: true,
      });
    }
    return;
  }

  const colW = hasTag ? (w - pad * 3) / 2 : w - pad * 2;
  // Cap the slot height rather than letting it stretch to the card. Photos are
  // portrait (roughly 3:4) or landscape; a slot much taller than ~1.45x its
  // width just letterboxes them in dead space. The photo block is then centred
  // in whatever room is left, with the captions tucked underneath it.
  const photoH = Math.min(availH, colW * 1.45);
  const photoY = photoTop + Math.max(0, (availH - photoH) / 2);
  const capY = photoY + photoH + 0.03;

  if (hasTag) {
    const left = x + pad;
    const right = x + pad * 2 + colW;
    addInnerPhoto(slide, { data: opts.serialImage, x: left, y: photoY, w: colW, h: photoH, fontSize: emptyFont });
    addInnerPhoto(slide, { data: opts.tagImage, x: right, y: photoY, w: colW, h: photoH, fontSize: emptyFont });
    addPhotoCaption(slide, {
      x: left, y: capY, w: colW, h: capH - 0.03,
      label: opts.serialLabel ?? 'Serial', value: opts.serialNumber, accent: COLORS.cyan, scale,
    });
    addPhotoCaption(slide, {
      x: right, y: capY, w: colW, h: capH - 0.03,
      label: opts.tagLabel ?? 'Tag', value: opts.tagNumber, accent: COLORS.magenta, scale,
    });
  } else {
    addInnerPhoto(slide, { data: opts.serialImage, x: x + pad, y: photoY, w: colW, h: photoH, fontSize: emptyFont });
    addPhotoCaption(slide, {
      x: x + pad, y: capY, w: colW, h: capH - 0.03,
      label: opts.serialLabel ?? 'Serial', value: opts.serialNumber, accent: COLORS.cyan, scale,
    });
  }
};
