import * as XLSX from "xlsx";
import { RmsScope, type Site, type SiteCreatePayload } from "@/types";
import { rmsScopeLabel } from "./helpers";

// Single source of truth for the bulk-import column order. Mirrors the
// SiteCreatePayload shape so each row is parseable by both the user and the
// backend after light coercion.
export const IMPORT_COLUMNS = [
  "siteName",
  "tawalId",
  "region",
  "siteCity",
  "tcnNumber",
  "rmsScope",
  "numberOfRms",
  "numberOfExpanders",
  "numberOfSims",
  "hasSmartLock",
  "numberOfFenceLocks",
  "numberOfOdus",
  "hasSmartMeter",
  "numberOfTenants",
] as const;

// Human-readable headers shown to the spreadsheet user on row 1. The parser
// keys off row 2 (the field names) so changing labels here is safe.
const IMPORT_DISPLAY_HEADERS: Record<(typeof IMPORT_COLUMNS)[number], string> =
  {
    siteName: "Site Name",
    tawalId: "Tawal ID",
    region: "Region",
    siteCity: "City",
    tcnNumber: "TCN Number",
    rmsScope: "RMS Scope",
    numberOfRms: "Number of RMS",
    numberOfExpanders: "Number of Expanders",
    numberOfSims: "Number of SIMs",
    hasSmartLock: "Has Smart Lock",
    numberOfFenceLocks: "Number of Fence Locks",
    numberOfOdus: "Number of ODUs",
    hasSmartMeter: "Has Smart Meter",
    numberOfTenants: "Number of Tenants",
  };

const triggerDownload = (wb: XLSX.WorkBook, filename: string) => {
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Build an empty template with the create-site columns plus a Reference sheet
// listing the valid enum values. The Sites sheet has a 3-row header:
//   Row 1 — branded title (merged across all columns, ignored by the parser)
//   Row 2 — human-readable display labels (ignored by the parser)
//   Row 3 — canonical field names (siteName, tawalId, …) used as the key map
//   Row 4+ data rows
export const downloadImportTemplate = () => {
  const wb = XLSX.utils.book_new();

  const titleRow: (string | null)[] = [
    "Tawal Smart Sites — Bulk Import Template",
    ...Array(IMPORT_COLUMNS.length - 1).fill(null),
  ];
  const displayRow = IMPORT_COLUMNS.map((k) => IMPORT_DISPLAY_HEADERS[k]);
  const fieldRow: string[] = [...IMPORT_COLUMNS];
  const sheet = XLSX.utils.aoa_to_sheet([titleRow, displayRow, fieldRow]);

  // Merge the title cell across the full width so row 1 reads as a banner.
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: IMPORT_COLUMNS.length - 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, "Sites");

  const refRows: (string | number)[][] = [
    ["Field", "Allowed values"],
    [
      "region",
      "free text — enter any value (e.g. North, South, East, West, Central, etc.)",
    ],
    ["siteCity", "free text — enter the city name as you want it stored"],
    ["rmsScope", Object.values(RmsScope).join(", ")],
    ["hasSmartLock / hasSmartMeter", "true / false (or 1 / 0)"],
    ["tawalId", "digits only"],
    [
      "numberOfSmartMeters / numberOfCtSplits / numberOfSilboGateways",
      "computed automatically by the backend — do not include",
    ],
    [
      "numberOfSmartMeters formula",
      "Math.ceil(numberOfTenants / 3)  — one meter per up-to-3 tenants",
    ],
    ["numberOfCtSplits formula", "numberOfTenants * 3"],
    ["numberOfSilboGateways", "always 1 for SMART_METER scope"],
    ["numberOfSims (SMART_METER)", "always 1 for SMART_METER scope"],
  ];
  const ref = XLSX.utils.aoa_to_sheet(refRows);
  XLSX.utils.book_append_sheet(wb, ref, "Reference");

  triggerDownload(wb, "tawal-sites-import-template.xlsx");
};

export interface ParsedRow {
  rowNumber: number;
  payload: SiteCreatePayload;
  errors: string[];
}

const coerceBool = (v: unknown): boolean | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return undefined;
};

const coerceInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
};

const isCellEmpty = (cell: unknown): boolean =>
  cell === undefined || cell === null || String(cell).trim() === "";

export const parseImportFile = async (file: File): Promise<ParsedRow[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // Read as an array-of-arrays so we can manually control which row is the
  // header. The template's 3-row banner has:
  //   index 0 — branded title (merged), ignored
  //   index 1 — display labels,         ignored
  //   index 2 — field names,            ← keys for each column
  //   index 3+ data rows
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const fieldNames = ((aoa[2] as unknown[]) ?? []).map((v) =>
    typeof v === "string" ? v.trim() : String(v ?? "").trim(),
  );
  if (fieldNames.length === 0) return [];

  const dataRows = aoa.slice(3);
  const out: ParsedRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = (dataRows[i] as unknown[]) ?? [];
    if (row.every(isCellEmpty)) continue;

    const obj: Record<string, unknown> = {};
    fieldNames.forEach((key, c) => {
      if (key) obj[key] = row[c];
    });

    // Spreadsheet row number is the array index + 4 (1-based), so the user
    // can locate the failing row in Excel even after we skip blank rows.
    out.push(validateRow(obj, i + 4));
  }
  return out;
};

// Only rmsScope is enum-shaped now (region/city are free text). Collapse
// whitespace + casing so users can type "Smart Lock" / "SMART_LOCK" / "smart
// lock" interchangeably and we still resolve to the canonical enum value.
const normalizeScopeInput = (row: Record<string, unknown>) => {
  row.rmsScope = String(row.rmsScope ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
};

const matchEnum = <T extends string>(
  raw: string,
  values: readonly T[],
): T | undefined => values.find((v) => v.toLowerCase() === raw);

const validateRow = (
  row: Record<string, unknown>,
  rowNumber: number,
): ParsedRow => {
  normalizeScopeInput(row);

  const errors: string[] = [];

  const str = (k: string) => String(row[k] ?? "").trim();
  const required = (k: string, val: string) => {
    if (!val) errors.push(`${k} is required`);
    return val;
  };

  const siteName = required("siteName", str("siteName"));
  const tawalId = required("tawalId", str("tawalId"));
  if (tawalId && !/^\d+$/.test(tawalId)) errors.push("tawalId must be numeric");

  const region = required("region", str("region"));
  const siteCity = required("siteCity", str("siteCity"));
  const tcnNumber = required("tcnNumber", str("tcnNumber"));

  const scopeRaw = str("rmsScope");
  const rmsScope = matchEnum(scopeRaw, Object.values(RmsScope));
  if (!scopeRaw) {
    errors.push("rmsScope is required");
  } else if (!rmsScope) {
    errors.push(
      `rmsScope must be one of: ${Object.values(RmsScope).join(", ")}`,
    );
  }

  const payload: SiteCreatePayload = {
    siteName,
    tawalId,
    region,
    siteCity,
    tcnNumber,
    rmsScope: rmsScope as RmsScope,
    numberOfRms: coerceInt(row.numberOfRms),
    numberOfExpanders: coerceInt(row.numberOfExpanders),
    numberOfSims: coerceInt(row.numberOfSims),
    hasSmartLock: coerceBool(row.hasSmartLock),
    numberOfFenceLocks: coerceInt(row.numberOfFenceLocks),
    numberOfOdus: coerceInt(row.numberOfOdus),
    hasSmartMeter: coerceBool(row.hasSmartMeter),
    numberOfTenants: coerceInt(row.numberOfTenants),
  };

  return { rowNumber, payload, errors };
};

// ── Export ─────────────────────────────────────────────────────────────────

// Map a Site into a flat row suitable for an Excel sheet. Status milestones
// are surfaced as Y/N columns so filtering inside Excel is trivial.
const siteToExportRow = (s: Site, technicianName?: string) => ({
  siteName: s.siteName,
  tawalId: s.tawalId,
  region: s.region,
  siteCity: s.siteCity,
  tcnNumber: s.tcnNumber,
  rmsScope: rmsScopeLabel(s.rmsScope),
  numberOfRms: s.numberOfRms,
  numberOfExpanders: s.numberOfExpanders,
  numberOfSims: s.numberOfSims,
  hasSmartLock: s.hasSmartLock ? "Yes" : "No",
  numberOfFenceLocks: s.numberOfFenceLocks,
  numberOfOdus: s.numberOfOdus,
  hasSmartMeter: s.hasSmartMeter ? "Yes" : "No",
  numberOfTenants: s.numberOfTenants,
  numberOfSmartMeters: s.numberOfSmartMeters,
  numberOfCtSplits: s.numberOfCtSplits,
  numberOfSilboGateways: s.numberOfSilboGateways,
  latitude: s.simSwapLatitude ?? "",
  longitude: s.simSwapLongitude ?? "",
  status_created: s.status?.created?.done ? "Y" : "N",
  status_assigned: s.status?.assigned?.done ? "Y" : "N",
  status_processing: s.status?.processing?.done ? "Y" : "N",
  status_completed: s.status?.completed?.done ? "Y" : "N",
  status_reviewed: s.status?.reviewed?.done ? "Y" : "N",
  assignedTo: technicianName ?? "",
  createdAt: s.createdAt
    ? new Date(s.createdAt).toISOString().slice(0, 19).replace("T", " ")
    : "",
});

export const downloadSitesExcel = (
  sites: Site[],
  technicianNameById: Record<string, string> = {},
  filename = "tawal-sites.xlsx",
) => {
  const rows = sites.map((s) => {
    const techId = s.status?.assigned?.assignedTo;
    const name = techId ? technicianNameById[techId] : undefined;
    return siteToExportRow(s, name);
  });

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, sheet, "Sites");
  triggerDownload(wb, filename);
};
