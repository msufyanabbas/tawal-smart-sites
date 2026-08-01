import apiClient from "./client";
import type {
  DeleteResponse,
  Site,
  SiteCreatePayload,
  SiteUnitsPayload,
  SiteUpdatePayload,
  SiteStatusFilter,
  RmsScope,
} from "@/types";

export interface ListSitesFilters {
  region?: string;
  rmsScope?: RmsScope;
  status?: SiteStatusFilter;
  search?: string;
  from?: string;
  to?: string;
  siteCity?: string;
  simSwapSerial?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Dashboard stats ─────────────────────────────────────────────────────────

export interface SiteStageCounts {
  created: number;
  assigned: number;
  processing: number;
  completed: number;
  reviewed: number;
}

export interface RegionCount {
  region: string;
  count: number;
}

export interface CityOption {
  city: string;
  region: string;
}

export interface RecentSiteActivity {
  _id: string;
  siteName: string;
  tawalId: string;
  stage: string;
  createdAt?: string;
}

export interface PendingReviewItem {
  _id: string;
  siteName: string;
  completedAt?: string;
}

export interface TechnicianDrilldownItem {
  _id: string;
  siteName: string;
  assignedAt?: string;
}

export interface TechnicianProgressItem {
  _id: string;
  siteName: string;
  acceptedAt?: string;
}

export interface SiteStats {
  totals: {
    total: number;
    byStage: SiteStageCounts;
    completedThisMonth: number;
  };
  byScope: Record<string, number>;
  byRegion: RegionCount[];
  cities: CityOption[];
  recent: RecentSiteActivity[];
  pendingReview: PendingReviewItem[];
  // Present only for technician-role responses.
  pendingAcceptance?: TechnicianDrilldownItem[];
  inProgress?: TechnicianProgressItem[];
  completed?: number;
}

const clean = (obj: object): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
};

export const listSites = async (
  filters: ListSitesFilters = {},
): Promise<PaginatedResponse<Site>> => {
  const { data } = await apiClient.get<PaginatedResponse<Site> | Site[]>(
    "/sites",
    {
      params: clean(filters),
    },
  );
  // The backend returns a plain array when no pagination params are passed
  // (for mobile-app backward compatibility). Normalize it to the paginated
  // shape the web UI expects so callers can always rely on `data.data`.
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

export const getDashboardData = async (): Promise<SiteStats> => {
  const { data } = await apiClient.get<SiteStats>("/dashboard");
  return data;
};

export const getSite = async (id: string): Promise<Site> => {
  const { data } = await apiClient.get<Site>(`/sites/${id}`);
  return data;
};

export const createSite = async (payload: SiteCreatePayload): Promise<Site> => {
  const { data } = await apiClient.post<Site>("/sites", payload);
  return data;
};

export interface BulkCreateResult {
  created: number;
  failed: Array<{ row: number; reason: string }>;
}

export const bulkCreateSites = async (
  sites: SiteCreatePayload[],
): Promise<BulkCreateResult> => {
  const { data } = await apiClient.post<BulkCreateResult>("/sites/bulk", {
    sites,
  });
  return data;
};

export const updateSite = async (
  id: string,
  payload: SiteUpdatePayload,
): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}`, payload);
  return data;
};

export const deleteSite = async (id: string): Promise<DeleteResponse> => {
  const { data } = await apiClient.delete<DeleteResponse>(`/sites/${id}`);
  return data;
};

// Status transitions
export const assignSite = async (
  id: string,
  technicianId: string,
): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/assign`, {
    technicianId,
  });
  return data;
};

export const acceptSite = async (id: string): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/accept`, {});
  return data;
};

export const saveSiteDraft = async (
  id: string,
  payload: SiteUnitsPayload,
): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/draft`, payload);
  return data;
};

export const submitSite = async (
  id: string,
  payload: SiteUnitsPayload,
): Promise<Site> => {
  console.log(payload);
  const { data } = await apiClient.patch<Site>(`/sites/${id}/submit`, payload);
  return data;
};

export const reviewSite = async (
  id: string,
  remarks?: string,
): Promise<Site> => {
  const body = remarks && remarks.trim() ? { remarks: remarks.trim() } : {};
  const { data } = await apiClient.patch<Site>(`/sites/${id}/review`, body);
  return data;
};
