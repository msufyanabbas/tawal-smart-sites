/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImagedSerialTag, Site, SiteDocument, RmsScope } from '../../site/site.schema';
import { TAWAL_LOGO, SMART_LIFE_LOGO, ICON_CUBES, ICON_BULB, ICON_CALENDAR, ICON_CLOCK } from './rfp-assets';
import { COLORS, FONT, PANEL_W, SIZE, SLIDE_H, SLIDE_W, scopeLabel } from './rfp-theme';
import {
  addBackground,
  addContentHeader,
  addFooter,
  addLogoBadge,
  addPhotoFrame,
  addSidePanel,
  addStat,
  addUnitCard,
  toPptxImageData,
  gridLayout,
  MAX_PER_PAGE,
  PptxSlide,
} from './rfp-layout';
import { RfpUnitGroup, resolveUnitGroups } from './rfp-groups';

/**
 * pptxgenjs ships a CommonJS build whose module.exports IS the constructor —
 * there is no `.default` on it. This project's tsconfig enables
 * `allowSyntheticDefaultImports` (types) but not `esModuleInterop` (runtime),
 * so `import PptxGenJS from 'pptxgenjs'` would compile but emit
 * `pptxgenjs_1.default`, which is undefined at runtime. Requiring it directly
 * and typing the const keeps both the compiler and Node happy.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PptxGenJS: typeof import('pptxgenjs').default = require('pptxgenjs');
type Pptx = InstanceType<typeof PptxGenJS>;

@Injectable()
export class RfpReportService {
  constructor(@InjectModel(Site.name) private siteModel: Model<SiteDocument>) {}

  // ── Public entry point ───────────────────────────────────────────────────

  /**
   * Build the "Smart Tower Site RFP report" deck for one site and return it as
   * a buffer the controller can stream.
   */
  async buildSiteRfp(siteId: string): Promise<{ buffer: Buffer; filename: string }> {
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException('Invalid site id');
    }
    // Images live on the document itself, so this read is deliberately
    // unprojected — the whole point of the deck is the photos.
    const site = await this.siteModel.findById(siteId).lean();
    if (!site) throw new NotFoundException('Site not found');

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.author = 'Smart Life';
    pres.company = 'Smart Life | Innovative Solutions';
    pres.title = `${site.siteName ?? 'Site'} RFP Report`;

    const groups = resolveUnitGroups(site as Site);

    this.addCoverSlide(pres, site as Site);
    this.addSiteDetailsSlide(pres, site as Site, groups);

    // One page per equipment type, then a single page tabulating every unit.
    for (const group of groups) {
      this.addGroupSlides(pres, site as Site, group);
    }

    if ((site as Site).rmsScope === RmsScope.SIM_SWAP) {
      this.addSimSwapSlides(pres, site as Site);
    }

    this.addSummarySlides(pres, site as Site, groups);
    this.addConclusionSlide(pres, site as Site, groups);
    this.addThankYouSlide(pres);

    const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer;
    const safeName = String(site.siteName ?? site.tawalId ?? 'Site')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'Site';

    return { buffer, filename: `${safeName}_Site_RFP_Report.pptx` };
  }

  // ── Slide 1: cover ───────────────────────────────────────────────────────

  private addCoverSlide(pres: Pptx, site: Site): void {
    const slide = pres.addSlide();
    addBackground(slide);

    // White header band with the two brand marks.
    slide.addShape('rect', {
      x: 0, y: 0, w: SLIDE_W, h: 0.83,
      fill: { color: COLORS.white }, line: { type: 'none' },
    });
    slide.addShape('rect', {
      x: 0, y: 0.82, w: SLIDE_W, h: 0.012,
      fill: { color: COLORS.border }, line: { type: 'none' },
    });
    slide.addText(
      [
        { text: 'Smart Life', options: { bold: true, fontSize: 15, color: COLORS.coverNavy } },
        { text: ' | Innovative Solutions', options: { fontSize: 10, color: COLORS.muted } },
      ],
      { x: 0.62, y: 0.24, w: 5.0, h: 0.34, isTextBox: true, margin: 0, fontFace: FONT, valign: 'middle' },
    );
    slide.addImage({ data: TAWAL_LOGO, x: 10.02, y: 0.1, w: 2.69, h: 0.59 });

    // Concentric rings behind the Smart Life mark.
    slide.addShape('ellipse', {
      x: 5.42, y: 1.25, w: 2.5, h: 2.5,
      fill: { color: 'FFFFFF', transparency: 55 },
      line: { color: 'DBE7F5', width: 1 },
    });
    slide.addShape('ellipse', {
      x: 5.73, y: 1.56, w: 1.88, h: 1.88,
      fill: { color: COLORS.white },
      line: { color: 'E8F0FB', width: 1 },
    });
    slide.addImage({ data: SMART_LIFE_LOGO, x: 6.16, y: 2.06, w: 1.02, h: 0.82 });

    // Scattered dots — the cover's light decorative texture.
    for (const [x, y] of [[1.56, 1.85], [11.46, 2.13], [2.29, 6.19], [11.98, 5.7]]) {
      slide.addShape('ellipse', {
        x, y, w: 0.08, h: 0.08,
        fill: { color: COLORS.coverBlue, transparency: 40 }, line: { type: 'none' },
      });
    }

    slide.addText('Smart Tower Site RFP report', {
      x: 1.4, y: 4.02, w: 10.53, h: 0.8,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.coverTitle, bold: true, color: COLORS.coverNavy,
      align: 'center', valign: 'middle',
    });
    slide.addText(site.siteCity ? `${site.region} — ${site.siteCity}` : site.region || '', {
      x: 2.44, y: 4.9, w: 8.46, h: 0.3,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: 14, color: COLORS.muted,
      align: 'center', valign: 'middle',
    });
    slide.addText(scopeLabel(site.rmsScope), {
      x: 2.44, y: 5.26, w: 8.46, h: 0.26,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: 12, color: COLORS.faint,
      align: 'center', valign: 'middle',
    });

    // Three stat columns, exactly as the template lays them out.
    addStat(slide, { x: 3.55, y: 5.72, w: 2.1, label: 'Site', value: site.siteName ?? '—' });
    addStat(slide, { x: 5.72, y: 5.72, w: 1.9, label: 'TAWAL ID', value: site.tawalId ?? '—' });
    addStat(slide, { x: 7.7, y: 5.72, w: 2.4, label: 'Scope', value: scopeLabel(site.rmsScope) });

    // Footer band with date/time, mirroring the template's calendar+clock icons.
    slide.addShape('rect', {
      x: 0, y: 6.88, w: SLIDE_W, h: 0.62,
      fill: { color: COLORS.white }, line: { type: 'none' },
    });
    slide.addShape('rect', {
      x: 0, y: 6.88, w: SLIDE_W, h: 0.012,
      fill: { color: COLORS.border }, line: { type: 'none' },
    });
    slide.addText('Confidential - Internal Use Only', {
      x: 0.62, y: 7.05, w: 4.0, h: 0.24,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.muted, valign: 'middle',
    });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    slide.addImage({ data: ICON_CALENDAR, x: 9.72, y: 7.09, w: 0.12, h: 0.14 });
    slide.addText(dateStr, {
      x: 9.9, y: 7.05, w: 1.7, h: 0.24,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.muted, valign: 'middle',
    });
    slide.addImage({ data: ICON_CLOCK, x: 11.66, y: 7.09, w: 0.14, h: 0.14 });
    slide.addText(timeStr, {
      x: 11.86, y: 7.05, w: 0.9, h: 0.24,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.label, color: COLORS.muted, valign: 'middle',
    });
  }

  // ── Slide 2: site details ────────────────────────────────────────────────

  private addSiteDetailsSlide(pres: Pptx, site: Site, groups: RfpUnitGroup[]): void {
    const slide = pres.addSlide();
    addBackground(slide);
    addSidePanel(slide);
    addLogoBadge(slide, 0.62, 0.62);

    slide.addText('Site\nDetails', {
      x: 0.62, y: 2.1, w: 3.9, h: 1.2,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.panelTitle, bold: true, color: COLORS.white,
      lineSpacingMultiple: 1.0,
    });
    slide.addText(scopeLabel(site.rmsScope), {
      x: 0.62, y: 3.5, w: 3.83, h: 0.4,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: 14, color: COLORS.cyan,
    });
    slide.addText(
      'Site identification, scope and captured equipment for this RFP submission.',
      {
        x: 0.62, y: 4.05, w: 3.83, h: 1.0,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: SIZE.body, color: 'C7BFD6',
      },
    );

    // Identification grid — two rows of three.
    const cells: Array<[string, string]> = [
      ['Site Name', site.siteName ?? '—'],
      ['TAWAL ID', site.tawalId ?? '—'],
      ['TCN Number', site.tcnNumber ?? '—'],
      ['Region', site.region ?? '—'],
      ['City', site.siteCity ?? '—'],
      ['Item Code', site.itemCode || '—'],
    ];
    const gx = 6.0;
    const gw = 2.2;
    const gap = 0.25;
    cells.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addStat(slide, {
        x: gx + col * (gw + gap),
        y: 1.35 + row * 0.95,
        w: gw,
        label,
        value,
        color: COLORS.slate,
        align: 'left',
      });
    });

    // Equipment summary card — the counts this deck goes on to evidence.
    // Height follows the row count so a two-type site does not get a card
    // with three rows of dead space under it.
    const cardY = 3.5;
    const shownGroups = groups.slice(0, 6);
    const groupRows = Math.max(1, Math.ceil(shownGroups.length / 2));
    const overflowNote = groups.length > shownGroups.length;
    const cardH = 0.72 + groupRows * 0.72 + (overflowNote ? 0.36 : 0.18);
    slide.addShape('roundRect', {
      x: 6.0, y: cardY, w: 6.7, h: cardH,
      rectRadius: 0.06,
      fill: { color: COLORS.white },
      line: { color: COLORS.border, width: 0.75 },
    });
    slide.addText('Equipment Captured', {
      x: 6.32, y: cardY + 0.22, w: 6.06, h: 0.3,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.cardTitle, bold: true, color: COLORS.slate,
      valign: 'middle',
    });

    if (groups.length) {
      const accents = [COLORS.cyan, COLORS.magenta, COLORS.purple];
      shownGroups.forEach((g, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 6.32 + col * 3.2;
        const cy = cardY + 0.72 + row * 0.72;
        slide.addShape('ellipse', {
          x: cx, y: cy + 0.08, w: 0.16, h: 0.16,
          fill: { color: accents[i % accents.length] }, line: { type: 'none' },
        });
        slide.addText(g.label, {
          x: cx + 0.28, y: cy, w: 2.6, h: 0.3,
          isTextBox: true, margin: 0,
          fontFace: FONT, fontSize: SIZE.body, bold: true, color: COLORS.slate,
          valign: 'middle',
        });
        slide.addText(
          `${g.units.length} captured${g.expected && g.expected !== g.units.length ? ` of ${g.expected}` : ''}`,
          {
            x: cx + 0.28, y: cy + 0.28, w: 2.6, h: 0.24,
            isTextBox: true, margin: 0,
            fontFace: FONT, fontSize: SIZE.caption, color: COLORS.muted,
            valign: 'middle',
          },
        );
      });
      if (overflowNote) {
        slide.addText(`+ ${groups.length - shownGroups.length} more equipment type(s) detailed in the following pages`, {
          x: 6.32, y: cardY + 0.72 + groupRows * 0.72, w: 6.06, h: 0.26,
          isTextBox: true, margin: 0,
          fontFace: FONT, fontSize: SIZE.caption, color: COLORS.faint, valign: 'middle',
        });
      }
    } else {
      slide.addText('No equipment has been captured for this site yet.', {
        x: 6.32, y: cardY + 1.3, w: 6.06, h: 0.4,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: SIZE.body, color: COLORS.muted,
        align: 'center', valign: 'middle',
      });
    }
  }

  // ── One page per equipment type ──────────────────────────────────────────

  /**
   * Renders a whole equipment type onto a single page: every unit of that type
   * as a card carrying its photo, asset-tag photo, serial number and tag
   * number. A type with one unit fills the page; nine sit in a 3x3.
   *
   * Beyond MAX_PER_PAGE units the type spills onto further pages rather than
   * shrinking the cards past legibility.
   */
  private addGroupSlides(pres: Pptx, site: Site, group: RfpUnitGroup): void {
    const pages: ImagedSerialTag[][] = [];
    for (let i = 0; i < group.units.length; i += MAX_PER_PAGE) {
      pages.push(group.units.slice(i, i + MAX_PER_PAGE));
    }
    if (!pages.length) return;

    pages.forEach((page, pageIndex) => {
      const slide = pres.addSlide();
      addBackground(slide);

      const heading =
        pages.length > 1
          ? `${group.label} (${pageIndex + 1} of ${pages.length})`
          : group.label;
      const captured =
        `${group.units.length} unit${group.units.length === 1 ? '' : 's'} captured` +
        (group.expected && group.expected !== group.units.length
          ? ` of ${group.expected} planned`
          : '');
      addContentHeader(
        slide,
        heading,
        `${site.siteName ?? ''} · ${site.tawalId ?? ''} · ${captured}`,
      );

      const { cols, cardW, cardH, gap, originX, originY } = gridLayout(page.length);

      page.forEach((unit, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const unitNumber = pageIndex * MAX_PER_PAGE + i + 1;
        addUnitCard(slide, {
          x: originX + col * (cardW + gap),
          y: originY + row * (cardH + gap),
          w: cardW,
          h: cardH,
          title:
            group.units.length === 1
              ? group.singular
              : `${group.singular} ${unitNumber}`,
          serialImage: toPptxImageData(unit.serialImage),
          tagImage: toPptxImageData(unit.tagImage),
          serialNumber: unit.serialNumber,
          tagNumber: unit.tagNumber,
          hasTag: group.hasTag,
        });
      });

      addFooter(slide, `${group.label} · ${site.tawalId ?? ''}`);
    });
  }

  /** "Tag ABC123 · S/N 998877", trimmed to whichever parts exist. */
  private unitSubtitle(unit: ImagedSerialTag, hasTag: boolean): string {
    const parts: string[] = [];
    if (hasTag && unit.tagNumber?.trim()) parts.push(`Tag ${unit.tagNumber.trim()}`);
    if (unit.serialNumber?.trim()) parts.push(`S/N ${unit.serialNumber.trim()}`);
    return parts.length ? parts.join('  ·  ') : 'No identifiers recorded';
  }

  /** The serial/tag callout strip beneath a full-width pair of photos. */
  private addIdentifierBar(
    slide: PptxSlide,
    items: Array<{ label: string; value?: string; accent: string }>,
  ): void {
    const y = 5.82;
    const h = 0.86;
    const total = SLIDE_W - 1.24;
    const gap = 0.25;
    const w = (total - gap * (items.length - 1)) / items.length;

    items.forEach((item, i) => {
      const x = 0.62 + i * (w + gap);
      slide.addShape('roundRect', {
        x, y, w, h,
        rectRadius: 0.05,
        fill: { color: COLORS.white },
        line: { color: COLORS.border, width: 0.75 },
      });
      slide.addShape('rect', {
        x, y: y + 0.16, w: 0.06, h: h - 0.32,
        fill: { color: item.accent }, line: { type: 'none' },
      });
      slide.addText(item.label.toUpperCase(), {
        x: x + 0.26, y: y + 0.12, w: w - 0.5, h: 0.24,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: SIZE.caption, bold: true, color: COLORS.muted,
        charSpacing: 1, valign: 'middle',
      });
      slide.addText(item.value?.trim() || 'Not recorded', {
        x: x + 0.26, y: y + 0.38, w: w - 0.5, h: 0.34,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 15, bold: true,
        color: item.value?.trim() ? COLORS.slate : COLORS.faint,
        valign: 'middle',
      });
    });
  }

  // ── SIM swap: pairs and per-tenant CT evidence ───────────────────────────

  private addSimSwapSlides(pres: Pptx, site: Site): void {
    const pairs = (site.simSwapPairs ?? []).filter(
      (p) => p && (p.newSerialNumber || p.oldSerialNumber || p.newSerialImage || p.oldSerialImage),
    );
    const tenants = (site.simSwapTenants ?? []).filter(
      (t) => t && (t.tenantName || t.meterPhoto || (t.ctPhasePhotos ?? []).length),
    );

    if (!pairs.length && !tenants.length && !site.simSwapCtMainPhoto && !site.simSwapMeterPhoto) {
      return;
    }

    // Section divider for the SIM swap evidence.
    const divider = pres.addSlide();
    addBackground(divider);
    addSidePanel(divider);
    addLogoBadge(divider, 0.62, 0.62);
    divider.addText('SIM Swap\nEvidence', {
      x: 0.62, y: 2.2, w: 3.9, h: 1.4,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.panelTitle, bold: true, color: COLORS.white,
    });
    divider.addText(
      `${pairs.length} SIM pair${pairs.length === 1 ? '' : 's'} · ${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`,
      {
        x: 0.62, y: 3.76, w: 3.83, h: 0.4,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 14, color: COLORS.cyan,
      },
    );

    const meta: Array<[string, string]> = [];
    if (site.simSwapSiteType) meta.push(['Site Type', site.simSwapSiteType.replace(/_/g, ' ')]);
    if (site.simSwapLatitude != null && site.simSwapLongitude != null) {
      meta.push(['Coordinates', `${site.simSwapLatitude.toFixed(5)}, ${site.simSwapLongitude.toFixed(5)}`]);
    }
    meta.forEach(([label, value], i) => {
      addStat(divider, {
        x: 6.15 + i * 3.3, y: 1.4, w: 3.0, label, value, color: COLORS.slate, align: 'left',
      });
    });

    const mainCt = toPptxImageData(site.simSwapCtMainPhoto);
    const meterPhoto = toPptxImageData(site.simSwapMeterPhoto);
    if (mainCt || meterPhoto) {
      addPhotoFrame(divider, {
        data: mainCt, x: 6.15, y: 2.6, w: 3.05, h: 3.4,
        caption: 'CT main photo', emptyText: 'No CT main photo',
      });
      addPhotoFrame(divider, {
        data: meterPhoto, x: 9.5, y: 2.6, w: 3.05, h: 3.4,
        caption: 'Meter photo', emptyText: 'No meter photo',
      });
    }
    if (site.simSwapComments?.trim()) {
      divider.addText(site.simSwapComments.trim(), {
        x: 0.62, y: 4.4, w: 3.83, h: 1.9,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: SIZE.body, color: 'C7BFD6',
      });
    }
    addFooter(divider, `SIM Swap · ${site.tawalId ?? ''}`);

    // All SIM pairs on one page, old alongside new for each.
    if (pairs.length) {
      const slide = pres.addSlide();
      addBackground(slide);
      addContentHeader(
        slide,
        'SIM Swaps',
        `${site.siteName ?? ''} · ${site.tawalId ?? ''} · ${pairs.length} pair${pairs.length === 1 ? '' : 's'}`,
      );

      const { cols, cardW, cardH, gap, originX, originY } = gridLayout(
        Math.min(pairs.length, MAX_PER_PAGE),
      );

      pairs.slice(0, MAX_PER_PAGE).forEach((pair, i) => {
        addUnitCard(slide, {
          x: originX + (i % cols) * (cardW + gap),
          y: originY + Math.floor(i / cols) * (cardH + gap),
          w: cardW,
          h: cardH,
          title: pairs.length === 1 ? 'SIM Swap' : `SIM Swap ${i + 1}`,
          serialImage: toPptxImageData(pair.oldSerialImage),
          tagImage: toPptxImageData(pair.newSerialImage),
          serialNumber: pair.oldSerialNumber,
          tagNumber: pair.newSerialNumber,
          hasTag: true,
          serialLabel: 'Old Serial',
          tagLabel: 'New Serial',
        });
      });

      addFooter(slide, `SIM Swaps · ${site.tawalId ?? ''}`);
    }

    // One slide per tenant: meter photo plus up to three CT phase photos.
    tenants.forEach((tenant, i) => {
      const slide = pres.addSlide();
      addBackground(slide);
      addContentHeader(
        slide,
        tenant.tenantName?.trim() || `Tenant ${i + 1}`,
        `${site.siteName ?? ''} · Tenant ${i + 1} of ${tenants.length}`,
      );

      addPhotoFrame(slide, {
        data: toPptxImageData(tenant.meterPhoto),
        x: 0.62, y: 1.32, w: 4.1, h: 4.32,
        caption: 'Meter photo', emptyText: 'No meter photo captured',
      });

      const phases = tenant.ctPhasePhotos ?? [];
      const capacities = tenant.tenantCtCapacities ?? [];
      for (let p = 0; p < 3; p++) {
        addPhotoFrame(slide, {
          data: toPptxImageData(phases[p]),
          x: 4.92 + p * 2.72,
          y: 1.32,
          w: 2.52,
          h: 4.32,
          caption: capacities[p] ? `Phase ${p + 1} — ${capacities[p]}` : `Phase ${p + 1}`,
          emptyText: 'No photo',
        });
      }

      this.addIdentifierBar(slide, [
        { label: 'Tenant', value: tenant.tenantName, accent: COLORS.magenta },
        {
          label: 'CT Capacities',
          value: capacities.filter(Boolean).join(', '),
          accent: COLORS.purple,
        },
      ]);
      addFooter(slide, `Tenant ${i + 1}/${tenants.length}`);
    });
  }

  // ── Summary of every captured unit ───────────────────────────────────────

  /**
   * A single table listing every unit in the deck — type, number, serial and
   * tag — so a reviewer can check the whole site against the BOQ without
   * paging back through the photo sections. Spills onto further pages if the
   * site carries more rows than fit.
   */
  private addSummarySlides(pres: Pptx, site: Site, groups: RfpUnitGroup[]): void {
    interface Row {
      type: string;
      unit: string;
      serial: string;
      tag: string;
    }

    const rows: Row[] = [];
    for (const group of groups) {
      group.units.forEach((unit, i) => {
        rows.push({
          type: group.label,
          unit: group.units.length === 1 ? group.singular : `${group.singular} ${i + 1}`,
          serial: unit.serialNumber?.trim() || '—',
          tag: group.hasTag ? unit.tagNumber?.trim() || '—' : 'n/a',
        });
      });
    }

    if (!rows.length) return;

    const ROWS_PER_PAGE = 15;
    const pages: Row[][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
      pages.push(rows.slice(i, i + ROWS_PER_PAGE));
    }

    // Column geometry, shared by the header and every body row.
    const cols = [
      { key: 'type' as const, label: 'Equipment', x: 0.9, w: 3.0 },
      { key: 'unit' as const, label: 'Unit', x: 3.9, w: 2.6 },
      { key: 'serial' as const, label: 'Serial Number', w: 3.3, x: 6.5 },
      { key: 'tag' as const, label: 'Tag Number', x: 9.8, w: 2.6 },
    ];
    const rowH = 0.34;

    pages.forEach((page, pageIndex) => {
      const slide = pres.addSlide();
      addBackground(slide);
      addContentHeader(
        slide,
        pages.length > 1
          ? `Equipment Summary (${pageIndex + 1} of ${pages.length})`
          : 'Equipment Summary',
        `${site.siteName ?? ''} · ${site.tawalId ?? ''} · ${rows.length} unit${rows.length === 1 ? '' : 's'} total`,
      );

      const tableY = 1.24;
      const tableH = 0.44 + page.length * rowH + 0.18;
      slide.addShape('roundRect', {
        x: 0.62, y: tableY, w: SLIDE_W - 1.24, h: tableH,
        rectRadius: 0.06,
        fill: { color: COLORS.white },
        line: { color: COLORS.border, width: 0.75 },
      });

      // Header row.
      for (const col of cols) {
        slide.addText(col.label.toUpperCase(), {
          x: col.x, y: tableY + 0.1, w: col.w, h: 0.3,
          isTextBox: true, margin: 0,
          fontFace: FONT, fontSize: SIZE.caption, bold: true, color: COLORS.muted,
          charSpacing: 0.8, valign: 'middle',
        });
      }
      slide.addShape('rect', {
        x: 0.9, y: tableY + 0.42, w: SLIDE_W - 1.8, h: 0.012,
        fill: { color: COLORS.border }, line: { type: 'none' },
      });

      page.forEach((row, i) => {
        const y = tableY + 0.5 + i * rowH;
        // Zebra striping keeps long serial columns readable across the page.
        if (i % 2 === 1) {
          slide.addShape('rect', {
            x: 0.76, y: y - 0.02, w: SLIDE_W - 1.52, h: rowH,
            fill: { color: 'F1F5F9' }, line: { type: 'none' },
          });
        }
        for (const col of cols) {
          const value = row[col.key];
          const isFirst = col.key === 'type';
          slide.addText(value, {
            x: col.x, y, w: col.w, h: rowH - 0.02,
            isTextBox: true, margin: 0,
            fontFace: FONT, fontSize: 11,
            bold: isFirst,
            color: value === '—' || value === 'n/a' ? COLORS.faint : COLORS.slate,
            valign: 'middle', shrinkText: true,
          });
        }
      });

      // Totals strip under the table, on the last page only.
      if (pageIndex === pages.length - 1) {
        const stripY = tableY + tableH + 0.22;
        if (stripY + 0.72 < 6.9) {
          const accents = [COLORS.cyan, COLORS.magenta, COLORS.purple, COLORS.coverBlue];
          const shown = groups.slice(0, 6);
          const cellW = (SLIDE_W - 1.24) / Math.max(shown.length, 1);
          shown.forEach((g, i) => {
            addStat(slide, {
              x: 0.62 + i * cellW,
              y: stripY,
              w: cellW,
              label: g.label,
              value: String(g.units.length),
              color: accents[i % accents.length],
            });
          });
        }
      }

      addFooter(slide, `Equipment Summary · ${site.tawalId ?? ''}`);
    });
  }

  // ── Conclusion ───────────────────────────────────────────────────────────

  private addConclusionSlide(pres: Pptx, site: Site, groups: RfpUnitGroup[]): void {
    const slide = pres.addSlide();
    addBackground(slide);
    addSidePanel(slide);
    addLogoBadge(slide, 0.62, 0.62);

    slide.addText('Site Installation\nConclusion', {
      x: 0.62, y: 2.29, w: 3.9, h: 1.4,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: 28, bold: true, color: COLORS.white,
    });

    const reviewed = site.status?.reviewed?.done;
    const completed = site.status?.completed?.done;
    const summary = reviewed
      ? `Field work at ${site.siteName ?? 'this site'} has been submitted and approved. All captured equipment is evidenced in this report.`
      : completed
        ? `Field work at ${site.siteName ?? 'this site'} has been submitted and is awaiting review.`
        : `Field work at ${site.siteName ?? 'this site'} is still in progress. This report covers the equipment captured so far.`;

    slide.addText(summary, {
      x: 0.62, y: 4.01, w: 3.83, h: 1.6,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.body, color: COLORS.cyan,
    });

    // Two status cards, matching the template's rescheduled/next-action pair.
    const cards: Array<{ x: number; icon: string; accent: string; title: string; body: string }> = [
      {
        x: 6.15,
        icon: ICON_CUBES,
        accent: COLORS.magenta,
        title: 'Current Status',
        body: reviewed
          ? `Approved${this.formatDate(site.status?.reviewed?.at)}.`
          : completed
            ? `Submitted${this.formatDate(site.status?.completed?.at)} — pending manager review.`
            : site.status?.processing?.done
              ? 'Accepted by technician — field data entry in progress.'
              : 'Awaiting technician acceptance.',
      },
      {
        x: 9.79,
        icon: ICON_BULB,
        accent: COLORS.purple,
        title: 'Next Action',
        body: reviewed
          ? 'No further action required. Report ready for submission to TAWAL.'
          : completed
            ? 'Manager to review the submitted evidence and approve the site.'
            : 'Technician to complete the remaining equipment capture.',
      },
    ];

    for (const card of cards) {
      slide.addShape('roundRect', {
        x: card.x, y: 1.04, w: 2.71, h: 2.71,
        rectRadius: 0.05,
        fill: { color: COLORS.white },
        line: { color: COLORS.border, width: 0.75 },
      });
      slide.addShape('rect', {
        x: card.x, y: 1.04, w: 2.71, h: 0.05,
        fill: { color: card.accent }, line: { type: 'none' },
      });
      slide.addShape('ellipse', {
        x: card.x + 0.28, y: 1.42, w: 0.5, h: 0.5,
        fill: { color: 'F7EAF3' }, line: { type: 'none' },
      });
      slide.addImage({ data: card.icon, x: card.x + 0.41, y: 1.55, w: 0.24, h: 0.24 });
      slide.addText(card.title, {
        x: card.x + 0.28, y: 2.1, w: 2.15, h: 0.3,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: SIZE.cardTitle, bold: true, color: COLORS.slate,
        valign: 'middle',
      });
      slide.addText(card.body, {
        x: card.x + 0.28, y: 2.46, w: 2.18, h: 1.1,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 11, color: COLORS.muted,
      });
    }

    // Key highlights — the equipment types this report evidences.
    slide.addShape('roundRect', {
      x: 6.15, y: 4.38, w: 6.35, h: 2.08,
      rectRadius: 0.05,
      fill: { color: COLORS.white },
      line: { color: COLORS.border, width: 0.75 },
    });
    slide.addText('Key Highlights', {
      x: 6.45, y: 4.62, w: 5.75, h: 0.3,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: SIZE.body, bold: true, color: COLORS.slate,
      valign: 'middle',
    });

    const accents = [COLORS.cyan, COLORS.magenta, COLORS.purple, COLORS.coverBlue];
    // Three per row, not four — "Silbo Gateways" needs the width, and at four
    // columns the labels touch.
    const highlights = groups.slice(0, 6);
    if (highlights.length) {
      highlights.forEach((g, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 6.45 + col * 2.02;
        const y = 5.08 + row * 0.62;
        slide.addText(g.label, {
          x, y, w: 1.94, h: 0.28,
          isTextBox: true, margin: 0,
          fontFace: FONT, fontSize: 11, bold: true, color: accents[i % accents.length],
          valign: 'middle',
        });
        slide.addText(`${g.units.length} unit${g.units.length === 1 ? '' : 's'}`, {
          x, y: y + 0.26, w: 1.94, h: 0.22,
          isTextBox: true, margin: 0,
          fontFace: FONT, fontSize: SIZE.caption, color: COLORS.muted,
          valign: 'middle',
        });
      });
    } else {
      slide.addText('No equipment captured for this site.', {
        x: 6.45, y: 5.2, w: 5.75, h: 0.3,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 11, color: COLORS.muted, valign: 'middle',
      });
    }

    // Reviewer remarks carry through to the deck when present.
    if (site.status?.reviewed?.remarks?.trim()) {
      slide.addText(`Reviewer remarks: ${site.status.reviewed.remarks.trim()}`, {
        x: 0.62, y: 5.75, w: 3.83, h: 1.2,
        isTextBox: true, margin: 0,
        fontFace: FONT, fontSize: 11, color: 'C7BFD6',
      });
    }
  }

  private formatDate(at?: Date | string): string {
    if (!at) return '';
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    return ` on ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }

  // ── Closing slide ────────────────────────────────────────────────────────

  private addThankYouSlide(pres: Pptx): void {
    const slide = pres.addSlide();
    addBackground(slide);
    addSidePanel(slide);
    addLogoBadge(slide, 0.17, 0.29, 1.39);

    slide.addText('Thank\nYou', {
      x: 0.76, y: 3.0, w: 3.73, h: 1.6,
      isTextBox: true, margin: 0,
      fontFace: FONT, fontSize: 44, bold: true, color: COLORS.white,
    });

    slide.addShape('ellipse', {
      x: 10.84, y: 4.97, w: 2.24, h: 2.24,
      fill: { color: COLORS.white }, line: { type: 'none' },
    });
    slide.addImage({ data: TAWAL_LOGO, x: 11.07, y: 5.94, w: 1.89, h: 0.41 });
  }
}
