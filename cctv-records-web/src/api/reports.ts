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
