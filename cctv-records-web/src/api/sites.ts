import apiClient from './client';
import type {
  DeleteResponse,
  Site,
  SiteCreatePayload,
  SiteUnitsPayload,
  SiteUpdatePayload,
  SiteStatusFilter,
  RmsScope,
} from '@/types';

export interface ListSitesFilters {
  region?: string;
  rmsScope?: RmsScope;
  status?: SiteStatusFilter;
  search?: string;
  from?: string;
  to?: string;
}

const clean = (obj: object): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
};

export const listSites = async (filters: ListSitesFilters = {}): Promise<Site[]> => {
  const { data } = await apiClient.get<Site[]>('/sites', {
    params: clean(filters),
  });
  return data;
};

export const getSite = async (id: string): Promise<Site> => {
  const { data } = await apiClient.get<Site>(`/sites/${id}`);
  return data;
};

export const createSite = async (payload: SiteCreatePayload): Promise<Site> => {
  const { data } = await apiClient.post<Site>('/sites', payload);
  return data;
};

export interface BulkCreateResult {
  created: number;
  failed: Array<{ row: number; reason: string }>;
}

export const bulkCreateSites = async (
  sites: SiteCreatePayload[],
): Promise<BulkCreateResult> => {
  const { data } = await apiClient.post<BulkCreateResult>('/sites/bulk', { sites });
  return data;
};

export const updateSite = async (id: string, payload: SiteUpdatePayload): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}`, payload);
  return data;
};

export const deleteSite = async (id: string): Promise<DeleteResponse> => {
  const { data } = await apiClient.delete<DeleteResponse>(`/sites/${id}`);
  return data;
};

// Status transitions
export const assignSite = async (id: string, technicianId: string): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/assign`, { technicianId });
  return data;
};

export const acceptSite = async (id: string): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/accept`, {});
  return data;
};

export const saveSiteDraft = async (id: string, payload: SiteUnitsPayload): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/draft`, payload);
  return data;
};

export const submitSite = async (id: string, payload: SiteUnitsPayload): Promise<Site> => {
  const { data } = await apiClient.patch<Site>(`/sites/${id}/submit`, payload);
  return data;
};

export const reviewSite = async (id: string, remarks?: string): Promise<Site> => {
  const body = remarks && remarks.trim() ? { remarks: remarks.trim() } : {};
  const { data } = await apiClient.patch<Site>(`/sites/${id}/review`, body);
  return data;
};
