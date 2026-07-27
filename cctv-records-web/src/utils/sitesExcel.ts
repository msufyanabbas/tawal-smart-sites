import * as XLSX from "xlsx";
import { RmsScope, type Site, type SiteCreatePayload } from "@/types";
import { rmsScopeLabel } from "./helpers";

// Single source of truth for the bulk-import column order. Mirrors the
// SiteCreatePayload shape so each row is parseable by both the user and the
// backend after light coercion.
export const IMPORT_COLUMNS = [
  // ── Identity (required for all scopes) ────────────────────────────────
  "siteName",
  "tawalId",
  "region",
  "siteCity",
  "tcnNumber",
  "rmsScope",
  // ── RMS scope fields ───────────────────────────────────────────────────
  "numberOfRms",
  "numberOfExpanders",
  "numberOfSims",
  // ── Smart Lock (RMS / SIM_SWAP with smart lock) ────────────────────────
  "hasSmartLock",
  "numberOfFenceLocks",
  "numberOfOdus",
  // ── Smart Meter (RMS / SIM_SWAP / SMART_METER / RMS_SERVICE) ──────────
  "hasSmartMeter",
  "numberOfTenants",
  // ── SIM Swap admin pre-fill (SIM_SWAP scope only) ─────────────────────
  "simSwapSiteType",
  "simSwapLatitude",
  "simSwapLongitude",
] as const;

// Human-readable headers shown to the spreadsheet user on row 2. The parser
// keys off row 3 (the field names) so changing labels here is safe.
const IMPORT_DISPLAY_HEADERS: Record<(typeof IMPORT_COLUMNS)[number], string> =
  {
    siteName: "Site Name",
    tawalId: "Tawal ID",
    region: "Region",
    siteCity: "City",
    tcnNumber: "TCN Number",
    rmsScope: "RMS Scope",
    numberOfRms: "# RMS Units",
    numberOfExpanders: "# Expanders",
    numberOfSims: "# SIMs",
    hasSmartLock: "Has Smart Lock",
    numberOfFenceLocks: "# Fence Locks",
    numberOfOdus: "# ODUs",
    hasSmartMeter: "Has Smart Meter",
    numberOfTenants: "# Tenants",
    simSwapSiteType: "SIM Swap — Site Type",
    simSwapLatitude: "SIM Swap — Latitude",
    simSwapLongitude: "SIM Swap — Longitude",
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
    ["Field", "Notes / Allowed values"],

    // ── Identity ──────────────────────────────────────────────────────────
    ["--- IDENTITY (required for all scopes) ---", ""],
    ["siteName", "Required. Free text."],
    ["tawalId", "Required. Digits only (e.g. 123456)."],
    ["region", "Required. Free text (e.g. North, South, East, West, Central)."],
    [
      "siteCity",
      "Required. Free text — enter the city name as you want it stored.",
    ],
    ["tcnNumber", "Required. Free text."],
    ["rmsScope", `Required. One of: ${Object.values(RmsScope).join(", ")}`],

    // ── RMS scope ─────────────────────────────────────────────────────────
    ["--- RMS scope fields (rmsScope = RMS) ---", ""],
    ["numberOfRms", "Number of RMS units. Leave blank for other scopes."],
    ["numberOfExpanders", "Number of expanders. Leave blank for other scopes."],
    [
      "numberOfSims",
      "Number of SIM cards. For RMS and SIM_SWAP scopes; leave blank otherwise.",
    ],

    // ── Smart Lock ────────────────────────────────────────────────────────
    ["--- Smart Lock fields (RMS or SIM_SWAP with smart lock) ---", ""],
    [
      "hasSmartLock",
      "true / false  (or 1 / 0). Applies to RMS and SIM_SWAP scopes.",
    ],
    [
      "numberOfFenceLocks",
      "Required when hasSmartLock = true. Leave blank otherwise.",
    ],
    [
      "numberOfOdus",
      "Required when hasSmartLock = true. Leave blank otherwise.",
    ],

    // ── Smart Meter ───────────────────────────────────────────────────────
    [
      "--- Smart Meter fields (RMS / SIM_SWAP / SMART_METER / RMS_SERVICE) ---",
      "",
    ],
    [
      "hasSmartMeter",
      "true / false  (or 1 / 0). Applies to RMS and SIM_SWAP scopes. Always true for SMART_METER scope.",
    ],
    [
      "numberOfTenants",
      "Required when hasSmartMeter = true. Drives auto-computed counts below.",
    ],
    [
      "numberOfSmartMeters (computed)",
      "Math.ceil(numberOfTenants / 3) — one meter per up-to-3 tenants. Do NOT enter; backend computes this.",
    ],
    [
      "numberOfCtSplits (computed)",
      "numberOfTenants × 3. Do NOT enter; backend computes this.",
    ],
    [
      "numberOfSilboGateways (computed)",
      "Always 1 for SMART_METER scope. Do NOT enter; backend computes this.",
    ],
    [
      "numberOfSims (SMART_METER)",
      "Always 1 for SMART_METER scope (SIM for Silbo gateway). Do NOT enter; backend computes this.",
    ],

    // ── SIM Swap admin pre-fill ───────────────────────────────────────────
    ["--- SIM Swap admin pre-fill (rmsScope = SIM_SWAP only) ---", ""],
    [
      "simSwapSiteType",
      `Optional admin pre-fill. One of: green_field, roof_top. Leave blank for other scopes.`,
    ],
    [
      "simSwapLatitude",
      "Optional admin pre-fill. Decimal degrees (e.g. 24.7136). Leave blank for other scopes.",
    ],
    [
      "simSwapLongitude",
      "Optional admin pre-fill. Decimal degrees (e.g. 46.6753). Leave blank for other scopes.",
    ],
  ];

  const ref = XLSX.utils.aoa_to_sheet(refRows);
  // Widen the two columns in the Reference sheet for readability.
  ref["!cols"] = [{ wch: 55 }, { wch: 90 }];
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

  // SIM Swap optional admin pre-fill fields
  const simSwapSiteTypeRaw = str("simSwapSiteType");
  const simSwapSiteType = simSwapSiteTypeRaw
    ? matchEnum(simSwapSiteTypeRaw, ["green_field", "roof_top"] as const)
    : undefined;
  if (simSwapSiteTypeRaw && !simSwapSiteType) {
    errors.push(`simSwapSiteType must be one of: green_field, roof_top`);
  }

  const coerceFloat = (v: unknown): number | null | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : undefined;
  };

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
    // SIM Swap admin pre-fill (only populated when the column is present)
    ...(simSwapSiteType ? { simSwapSiteType } : {}),
    ...(coerceFloat(row.simSwapLatitude) !== undefined
      ? { simSwapLatitude: coerceFloat(row.simSwapLatitude) }
      : {}),
    ...(coerceFloat(row.simSwapLongitude) !== undefined
      ? { simSwapLongitude: coerceFloat(row.simSwapLongitude) }
      : {}),
  };

  return { rowNumber, payload, errors };
};

const joinUnitField = (
  units: ImagedSerialTag[] | undefined,
  field: "serialNumber" | "tagNumber",
) => {
  return (units || [])
    .map((unit) => unit[field]?.toString().trim())
    .filter(Boolean)
    .join("\n");
};

const joinSimSwapPairs = (
  pairs: any[] | undefined,
  field: "newSerialNumber" | "oldSerialNumber",
) => {
  return (pairs || [])
    .map((p) => p[field]?.toString().trim())
    .filter(Boolean)
    .join("\n");
};

const joinTenants = (tenants: any[] | undefined) => {
  return (tenants || [])
    .map((t) => t.tenantName?.toString().trim())
    .filter(Boolean)
    .join("\n");
};

const joinTenantCapacities = (tenants: any[] | undefined) => {
  return (tenants || [])
    .map((t) => {
      const caps = t.tenantCtCapacities || [];
      const p1 = caps[0] || "-";
      const p2 = caps[1] || "-";
      const p3 = caps[2] || "-";
      return `${t.tenantName || "Tenant"}: P1(${p1}), P2(${p2}), P3(${p3})`;
    })
    .join("\n");
};

// Map a Site into a flat row suitable for an Excel sheet. Status milestones
// are surfaced as Y/N columns so filtering inside Excel is trivial.
const siteToExportRow = (s: Site, technicianName?: string) => {
  const isSimSwap = s.rmsScope === RmsScope.SIM_SWAP;
  return {
    "Site Name": s.siteName,
    "Tawal ID": s.tawalId,
    "Region": s.region,
    "City": s.siteCity,
    "TCN Number": s.tcnNumber,
    "RMS Scope": rmsScopeLabel(s.rmsScope),
    // RMS Units
    "# RMS Units": s.numberOfRms,
    "RMS Serials": joinUnitField(s.rmsUnits, "serialNumber"),
    "RMS Tags": joinUnitField(s.rmsUnits, "tagNumber"),
    // Expanders
    "# Expanders": s.numberOfExpanders,
    "Expander Serials": joinUnitField(s.expanderUnits, "serialNumber"),
    "Expander Tags": joinUnitField(s.expanderUnits, "tagNumber"),
    // SIMs
    "# SIMs": s.numberOfSims,
    "SIM Serials": isSimSwap
      ? joinSimSwapPairs(s.simSwapPairs, "newSerialNumber")
      : joinUnitField(s.simCards, "serialNumber"),
    "SIM Tags": joinUnitField(s.simCards, "tagNumber"),
    // Smart Lock
    "Has Smart Lock": s.hasSmartLock ? "Yes" : "No",
    "# Fence Locks": s.numberOfFenceLocks,
    "Fence Lock Serials": joinUnitField(s.fenceLockUnits, "serialNumber"),
    "Fence Lock Tags": joinUnitField(s.fenceLockUnits, "tagNumber"),
    "# ODUs": s.numberOfOdus,
    "ODU Serials": joinUnitField(s.oduUnits, "serialNumber"),
    "ODU Tags": joinUnitField(s.oduUnits, "tagNumber"),
    // Smart Meter
    "Has Smart Meter": s.hasSmartMeter ? "Yes" : "No",
    "# Tenants": s.numberOfTenants,
    "# Smart Meters": s.numberOfSmartMeters,
    "Smart Meter Serials": joinUnitField(s.smartMeterUnits, "serialNumber"),
    "Smart Meter Tags": joinUnitField(s.smartMeterUnits, "tagNumber"),
    "# CT Splits": s.numberOfCtSplits,
    "CT Split Serials": joinUnitField(s.ctSplitUnits, "serialNumber"),
    "CT Split Tags": joinUnitField(s.ctSplitUnits, "tagNumber"),
    "# Silbo Gateways": s.numberOfSilboGateways,
    "Silbo Gateway Serials": joinUnitField(s.silboGatewayUnits, "serialNumber"),
    "Silbo Gateway Tags": joinUnitField(s.silboGatewayUnits, "tagNumber"),
    // SIM Swap Specific Columns
    "SIM Swap New Serials": joinSimSwapPairs(s.simSwapPairs, "newSerialNumber"),
    "SIM Swap Old Serials": joinSimSwapPairs(s.simSwapPairs, "oldSerialNumber"),
    "SIM Swap Site Type": s.simSwapSiteType
      ? s.simSwapSiteType === "green_field"
        ? "Green Field"
        : "Roof Top"
      : "",
    "SIM Swap Latitude": s.simSwapLatitude ?? "",
    "SIM Swap Longitude": s.simSwapLongitude ?? "",
    "SIM Swap Comments": s.simSwapComments ?? "",
    "Tenant Names": joinTenants(s.simSwapTenants),
    "Tenant CT Capacities": joinTenantCapacities(s.simSwapTenants),
    // Status milestones
    "Status Created": s.status?.created?.done ? "Y" : "N",
    "Status Assigned": s.status?.assigned?.done ? "Y" : "N",
    "Status Processing": s.status?.processing?.done ? "Y" : "N",
    "Status Completed": s.status?.completed?.done ? "Y" : "N",
    "Status Reviewed": s.status?.reviewed?.done ? "Y" : "N",
    "Assigned To": technicianName ?? "",
    "Created At": s.createdAt
      ? new Date(s.createdAt).toISOString().slice(0, 19).replace("T", " ")
      : "",
  };
};

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
