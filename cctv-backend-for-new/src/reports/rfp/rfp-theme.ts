/* eslint-disable prettier/prettier */
/**
 * Colours, fonts and geometry lifted from the approved "Smart Tower Site RFP
 * report" template (ZRU867_Site_RFP_Report.pptx). Every value here was read
 * out of that file's slide XML, so changing one changes the generated deck
 * away from the signed-off look — edit deliberately.
 */

// ── Palette ────────────────────────────────────────────────────────────────
export const COLORS = {
  /** Deep aubergine used for the full-bleed side panels. */
  ink: '1A0B2E',
  /** Body/heading text on light backgrounds. */
  slate: '1E293B',
  /** Secondary/caption text. */
  muted: '64748B',
  /** Faint text — timestamps, footnotes. */
  faint: '94A3B8',
  /** Page background. */
  bg: 'F8FAFC',
  white: 'FFFFFF',
  /** Hairlines and image frames. */
  border: 'CBD5E1',

  // Brand accents — the three-stripe motif down the panel edge.
  cyan: '00B4D8',
  magenta: 'E7007A',
  purple: '5A189A',

  // Cover-specific.
  coverBlue: '3B82F6',
  coverNavy: '1E3A5F',
} as const;

/**
 * The template is set in Montserrat throughout. If a viewer does not have it
 * installed PowerPoint substitutes a default sans — the layout still holds
 * because every text box below is sized with slack.
 */
export const FONT = 'Montserrat';

// ── Canvas ─────────────────────────────────────────────────────────────────
/** 13.333in x 7.5in — LAYOUT_WIDE, matching the template exactly. */
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

/**
 * Width of each bar in the cyan/magenta/purple stripe that runs down the edge
 * of every panelled slide, and the panel width itself.
 */
export const PANEL_W = 5.0;
export const STRIPE = { cyan: 0.12, magenta: 0.08, purple: 0.04 } as const;

// ── Type scale (points) ────────────────────────────────────────────────────
export const SIZE = {
  coverTitle: 36,
  panelTitle: 33,
  sectionTitle: 27,
  cardTitle: 16,
  statValue: 15,
  body: 13,
  label: 10,
  caption: 9,
} as const;

/** Human-readable names for the RmsScope enum, matching the mobile/web label helper. */
export const SCOPE_LABELS: Record<string, string> = {
  RMS: 'Complete RMS Scope',
  SMART_LOCK: 'Smart Lock Scope',
  SMART_METER: 'Smart Meter Scope',
  RMS_SERVICE: 'RMS Service Scope',
  SIM_SWAP: 'SIM Swap Scope',
  CCTV: 'CCTV Scope',
};

export const scopeLabel = (scope?: string): string =>
  (scope && SCOPE_LABELS[scope]) || scope || '—';

/**
 * Rotating brand accents used wherever equipment types are listed — the Site
 * Details card, the Equipment Summary table, and the conclusion's key
 * highlights. Index by the type's position in the resolved group list so a
 * given type wears the same colour on every page of the deck.
 */
export const GROUP_ACCENTS: readonly string[] = [
  COLORS.cyan,
  COLORS.magenta,
  COLORS.purple,
  COLORS.coverBlue,
];

export const groupAccent = (index: number): string =>
  GROUP_ACCENTS[index % GROUP_ACCENTS.length];
