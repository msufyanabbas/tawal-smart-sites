import apiClient from "./client";
import type { ReportFilters, Site } from "@/types";
import type { PaginatedResponse } from "./sites";

const clean = (obj: object): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
};

export interface ListReportSitesFilters extends ReportFilters {
  page?: number;
  limit?: number;
}

export const listReportSites = async (
  filters: ListReportSitesFilters,
): Promise<PaginatedResponse<Site>> => {
  const { data } = await apiClient.get<PaginatedResponse<Site> | Site[]>(
    "/reports/sites",
    {
      params: clean(filters),
    },
  );
  // The backend returns a plain array when no pagination params are passed
  // (for backward compatibility). Normalize it to the paginated shape the
  // web UI expects so callers can always rely on `data.data`.
  if (Array.isArray(data)) {
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }
  return data;
};

// Triggers the file download. The browser dialog opens via a transient <a>.
export const downloadReportExcel = async (
  filters: ReportFilters,
): Promise<void> => {
  const response = await apiClient.post<Blob>(
    "/reports/generate",
    {},
    { params: clean(filters), responseType: "blob" },
  );
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tawal-sites-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Downloads the per-site "Smart Tower Site RFP report" PowerPoint deck.
 *
 * The backend picks the filename (it derives it from the site name), so we
 * read it back off Content-Disposition when the header is exposed and only
 * fall back to building one locally if it isn't.
 */
export const downloadSiteRfpReport = async (
  siteId: string,
  fallbackName?: string,
): Promise<void> => {
  const response = await apiClient.get<Blob>(
    `/reports/sites/${siteId}/rfp`,
    { responseType: "blob" },
  );

  const disposition = String(
    response.headers?.["content-disposition"] ?? "",
  );
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const safeFallback = (fallbackName || "Site")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = match?.[1]
    ? decodeURIComponent(match[1])
    : `${safeFallback || "Site"}_Site_RFP_Report.pptx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
