import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/sites";
import type {
  SiteCreatePayload,
  SiteUnitsPayload,
  SiteUpdatePayload,
} from "@/types";

export const sitesKeys = {
  all: ["sites"] as const,
  list: (filters: api.ListSitesFilters) => ["sites", "list", filters] as const,
  detail: (id: string) => ["sites", id] as const,
};

export const useSitesQuery = (filters: api.ListSitesFilters = {}) =>
  useQuery({
    queryKey: sitesKeys.list(filters),
    queryFn: () => api.listSites(filters),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

export const useSiteQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? sitesKeys.detail(id) : ["sites", "none"],
    queryFn: () => api.getSite(id as string),
    enabled: !!id,
  });

export const useCreateSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SiteCreatePayload) => api.createSite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
    },
  });
};

export const useUpdateSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SiteUpdatePayload }) =>
      api.updateSite(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};

export const useDeleteSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
    },
  });
};

export const useAssignSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId: string }) =>
      api.assignSite(id, technicianId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};

export const useAcceptSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.acceptSite(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};

export const useSaveSiteDraftMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SiteUnitsPayload }) =>
      api.saveSiteDraft(id, payload),
    onSuccess: (data) => {
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};

export const useSubmitSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SiteUnitsPayload }) =>
      api.submitSite(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};

export const useReviewSiteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      api.reviewSite(id, remarks),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: sitesKeys.all });
      if (data?._id) qc.setQueryData(sitesKeys.detail(data._id), data);
    },
  });
};
