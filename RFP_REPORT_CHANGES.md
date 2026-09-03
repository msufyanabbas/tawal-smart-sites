# Site RFP Report — what changed

Adds a **Generate RFP report** action to the site detail screen (web + mobile)
that produces a PowerPoint deck matching the approved
`ZRU867_Site_RFP_Report.pptx` template, filled with the site's captured
equipment photos, serial numbers and tag numbers.

## Files

### Backend (`cctv-backend-for-new`)

| File | Status | What |
|---|---|---|
| `src/reports/rfp/rfp-assets.ts` | new | Smart Life + TAWAL logos and 4 icons, extracted from the template, inlined as base64 |
| `src/reports/rfp/rfp-theme.ts` | new | Palette, fonts, canvas geometry read out of the template's slide XML |
| `src/reports/rfp/rfp-groups.ts` | new | Resolves which equipment types belong in the deck, per scope |
| `src/reports/rfp/rfp-layout.ts` | new | Shared slide chrome: panel, stripe, logo badge, photo frames |
| `src/reports/rfp/rfp-report.service.ts` | new | Builds the deck with pptxgenjs |
| `src/reports/reports.controller.ts` | edited | `GET /reports/sites/:id/rfp` |
| `src/reports/reports.module.ts` | edited | Registers `RfpReportService` |
| `package.json` | edited | `+ pptxgenjs ^4.0.1` |

### Web (`cctv-records-web`)

| File | Status | What |
|---|---|---|
| `src/api/reports.ts` | edited | `downloadSiteRfpReport()` |
| `src/pages/SiteDetailPage.tsx` | edited | Button in the header, admin/manager only |

### Mobile (`cctv-records-app-for-new`)

| File | Status | What |
|---|---|---|
| `src/utils/rfpReport.ts` | new | Downloads to cache, opens the share sheet |
| `src/api/apiClient.ts` | edited | Exports `API_BASE_URL` |
| `src/api/siteService.ts` | edited | `siteRfpReportUrl()` helper + note on the auth gotcha |
| `src/screens/SiteDetailScreen.tsx` | edited | Button in the Actions card |
| `package.json` | edited | `+ expo-sharing ~14.0.7` |

## Install

```bash
cd cctv-backend-for-new      && npm install
cd ../cctv-records-app-for-new && npx expo install expo-sharing
```

Mobile needs a new dev/production build, not just a JS reload — `expo-sharing`
ships native code.

The web app needs no new dependency.

## Deck structure

1. **Cover** — same layout as the template: Smart Life / TAWAL header, ringed
   logo, title, then Site / TAWAL ID / Scope stat columns and the dated footer.
2. **Site Details** — identification grid (site name, TAWAL ID, TCN, region,
   city, item code) plus an equipment summary card.
3. **One page per equipment type.** Every unit of that type appears on the same
   page as a card carrying its photo, asset-tag photo, serial number and tag
   number. The grid adapts to the count: one unit fills the page, three sit in
   a row, nine go 3x3. Past nine the type spills onto a second page rather than
   shrinking the cards past legibility.

   Types with no asset tag (SIM cards, ODUs) show a single photo per card. A
   unit whose photo was never captured renders a labelled placeholder rather
   than a gap.
4. **SIM swap sites** additionally get an evidence divider, one page holding
   all old/new SIM pairs, and one page per tenant (meter photo + up to 3 CT
   phase photos with their capacities).
5. **Equipment Summary** — a single table of every unit in the deck (type,
   unit, serial, tag) with per-type totals underneath, so a reviewer can check
   the site against the BOQ without paging back through the photos. Spills onto
   further pages past 15 rows.
6. **Site Installation Conclusion** — status, next action, key highlights,
   reviewer remarks.
7. **Thank You.**

Which equipment types appear is driven by `resolveUnitGroups()`, which mirrors
`relevantUnitGroups()` in `SiteDetailScreen.tsx`. **If you change one, change
the other.** Empty pre-allocated units are filtered out, so a site expecting 9
CT splits that only captured 4 produces 4 cards, not 9.

## Notes for whoever picks this up next

- **`require`, not `import`, for pptxgenjs.** Its CommonJS build exports the
  constructor directly with no `.default`. This project's tsconfig has
  `allowSyntheticDefaultImports` but not `esModuleInterop`, so
  `import PptxGenJS from 'pptxgenjs'` compiles fine and then emits
  `pptxgenjs_1.default` — `undefined` at runtime. Please leave the `require`
  alone; there is a comment on it explaining this.
- **The endpoint is GET.** It takes no body and changes nothing, and mobile
  downloads it with `FileSystem.downloadAsync`, which only issues GETs.
- **Query-string auth does not work.** `jwt.strategy.ts` uses
  `ExtractJwt.fromAuthHeaderAsBearerToken()` only. The comment in
  `ReportsScreen.tsx` claiming the Excel endpoint accepts an `access_token`
  param is wrong — that flow 401s. The RFP download attaches a real
  Authorization header.
- **No image resizing.** The app already captures at `quality: 0.3`
  (`ImagePicker/index.tsx`), so no `sharp` or other native image dependency is
  needed. A 9-page deck lands around 3 MB and builds in ~200 ms.
- **Aspect ratios are computed, not delegated.** pptxgenjs's
  `sizing: { type: 'contain' }` does not reliably preserve proportions —
  photos come out stretched. `imageSize()` in `rfp-layout.ts` reads the real
  pixel dimensions from the JPEG/PNG header and `addFittedImage()` places an
  exactly-proportioned, centred rectangle. Do not swap these back for
  `sizing`.
- **Access is admin/manager**, inherited from the `@Roles` decorator on
  `ReportsController`. To let technicians pull reports for their own sites, the
  endpoint needs moving off that controller and a per-site assignment check.

## Known gaps

- `numberOfShelterLocks` exists on the schema but there is no
  `shelterLockUnits` array, and `relevantUnitGroups()` never emits shelter
  locks — so they are counted but never captured, and cannot appear in the
  report. Worth closing if shelter locks belong in the RFP.
- Only the first 6 equipment types appear on the Site Details summary card and
  the conclusion highlights; the rest are noted as a count. Every type still
  gets its full section in the body.

## Verified

- `nest build` clean; `tsc --noEmit` clean on all three apps (backend spec-file
  errors are pre-existing — the tsconfig `types` array omits jest).
- `vite build` clean.
- Two fixtures generated and rendered page-by-page, using portrait 1200x1600
  photos to match what the app actually captures: a SMART_METER site
  (3 meters / 9 CT splits / gateway / SIM, one tag photo deliberately missing)
  → 9 pages, 3.05 MB; a SIM_SWAP site (2 pairs, 2 tenants) → 12 pages,
  4.03 MB. Both pass OOXML validation.
- End-to-end HTTP test through Nest: 200, correct Content-Type, correct
  `Content-Disposition` filename, 2.4 MB valid .pptx.
