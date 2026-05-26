import apiClient from './apiClient';
import {
  ApiResponse,
  RmsScope,
  Site,
  SiteCreatePayload,
  SiteStatusFilter,
  SiteUnitsPayload,
  SiteUpdatePayload,
} from '../types';

const unwrap = async <T>(promise: Promise<{ data: T }>): Promise<ApiResponse<T>> => {
  try {
    const response = await promise;
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Request failed',
    };
  }
};

export interface ListSitesFilters {
  region?: string;
  rmsScope?: RmsScope;
  status?: SiteStatusFilter;
  search?: string;
  from?: string;
  to?: string;
}

const cleanParams = (obj: ListSitesFilters | undefined) => {
  if (!obj) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
};

// ── Sites ───────────────────────────────────────────────────────────────────

export const getSites = (filters?: ListSitesFilters) =>
  unwrap<Site[]>(apiClient.get('/sites', { params: cleanParams(filters) }));

export const getSiteById = (id: string) =>
  unwrap<Site>(apiClient.get(`/sites/${id}`));

export const createSite = (payload: SiteCreatePayload) =>
  unwrap<Site>(apiClient.post('/sites', payload));

export const updateSite = (id: string, payload: SiteUpdatePayload) =>
  unwrap<Site>(apiClient.patch(`/sites/${id}`, payload));

export const deleteSite = (id: string) =>
  unwrap<{ deleted: boolean }>(apiClient.delete(`/sites/${id}`));

// ── Status transitions ─────────────────────────────────────────────────────

export const assignSite = (id: string, technicianId: string) =>
  unwrap<Site>(apiClient.patch(`/sites/${id}/assign`, { technicianId }));

export const acceptSite = (id: string) =>
  unwrap<Site>(apiClient.patch(`/sites/${id}/accept`, {}));

export const saveSiteDraft = (id: string, payload: SiteUnitsPayload) =>
  unwrap<Site>(apiClient.patch(`/sites/${id}/draft`, payload));

export const submitSite = (id: string, payload: SiteUnitsPayload) =>
  unwrap<Site>(apiClient.patch(`/sites/${id}/submit`, payload));

export const reviewSite = (id: string, remarks?: string) => {
  const body = remarks && remarks.trim() ? { remarks: remarks.trim() } : {};
  return unwrap<Site>(apiClient.patch(`/sites/${id}/review`, body));
};

// ── Reports ────────────────────────────────────────────────────────────────

export interface ReportFilters {
  region?: string;
  rmsScope?: RmsScope;
  status?: SiteStatusFilter;
  from?: string;
  to?: string;
}

export const listReportSites = (filters: ReportFilters) =>
  unwrap<Site[]>(apiClient.get('/reports/sites', { params: cleanParams(filters) }));

// Returns the absolute URL the device can open (Linking.openURL) to trigger
// the Excel download. The /reports/generate POST is wrapped in the URL with
// the access token as an Authorization header would be — but since we can't
// add auth headers to a browser-opened URL, the caller should instead use
// `downloadReportFile` below, which streams via axios + saves locally.
export const reportDownloadUrl = (baseUrl: string, filters: ReportFilters): string => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(cleanParams(filters) ?? {})) {
    params.append(k, String(v));
  }
  const qs = params.toString();
  return `${baseUrl.replace(/\/$/, '')}/reports/generate${qs ? `?${qs}` : ''}`;
};
