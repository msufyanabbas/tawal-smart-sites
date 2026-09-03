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
3. **Per equipment type:**
   - a **section divider** (dark panel) indexing every unit by tag and serial;
   - then **one slide per unit** — unit photo left, asset tag photo right,
     serial number and tag number in a callout bar underneath.

   Types carrying no tag (SIM cards, ODUs) get a single centred photo instead
   of a half-empty pair. A unit whose photo was never captured renders a
   labelled placeholder rather than a gap.
4. **SIM swap sites** additionally get an evidence divider, one slide per
   old/new SIM pair, and one slide per tenant (meter photo + up to 3 CT phase
   photos with their capacities).
5. **Site PAT conclusion** — status, next action, key highlights, reviewer
   remarks.
6. **Thank You.**

Which equipment types appear is driven by `resolveUnitGroups()`, which mirrors
`relevantUnitGroups()` in `SiteDetailScreen.tsx`. **If you change one, change
the other.** Empty pre-allocated units are filtered out, so a site expecting 9
CT splits that only captured 4 produces 4 slides, not 9.

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
  needed. A 22-slide deck lands around 2.3 MB and builds in ~170 ms.
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
- Two fixtures generated and rendered slide-by-slide: a SMART_METER site
  (3 meters / 9 CT splits / gateway / SIM, one tag photo deliberately missing)
  → 22 slides, 2.29 MB; a SIM_SWAP site (2 pairs, 2 tenants) → 21 slides,
  2.81 MB. Both pass OOXML validation.
- End-to-end HTTP test through Nest: 200, correct Content-Type, correct
  `Content-Disposition` filename, 2.4 MB valid .pptx.
