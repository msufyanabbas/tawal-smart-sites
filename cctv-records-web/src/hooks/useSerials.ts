import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/serials";

// ── Query keys ────────────────────────────────────────────────────────────────

export const serialKeys = {
  allSim: ["serials", "sim"] as const,
  allRms: ["serials", "rms"] as const,
  allSmartLock: ["serials", "smartlock"] as const,
};

// ── SIM hooks ─────────────────────────────────────────────────────────────────

export const useSimSerialsQuery = () =>
  useQuery({ queryKey: serialKeys.allSim, queryFn: api.listSimSerials });

export const useCreateSimMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumber: string) => api.createSimSerial(serialNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSim });
    },
  });
};

export const useBulkCreateSimMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumbers: string[]) =>
      api.bulkCreateSimSerials(serialNumbers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSim });
    },
  });
};

export const useDeleteSimMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSimSerial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSim });
    },
  });
};

export const useBulkDeleteSimMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteSimSerials(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSim });
    },
  });
};

// ── RMS hooks ─────────────────────────────────────────────────────────────────

export const useRmsSerialsQuery = () =>
  useQuery({ queryKey: serialKeys.allRms, queryFn: api.listRmsSerials });

export const useCreateRmsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumber: string) => api.createRmsSerial(serialNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allRms });
    },
  });
};

export const useBulkCreateRmsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumbers: string[]) =>
      api.bulkCreateRmsSerials(serialNumbers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allRms });
    },
  });
};

export const useDeleteRmsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRmsSerial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allRms });
    },
  });
};

export const useBulkDeleteRmsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteRmsSerials(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allRms });
    },
  });
};

// ── Smart Lock hooks ──────────────────────────────────────────────────────────

export const useSmartLockSerialsQuery = () =>
  useQuery({
    queryKey: serialKeys.allSmartLock,
    queryFn: api.listSmartLockSerials,
  });

export const useCreateSmartLockMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumber: string) =>
      api.createSmartLockSerial(serialNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSmartLock });
    },
  });
};

export const useBulkCreateSmartLockMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serialNumbers: string[]) =>
      api.bulkCreateSmartLockSerials(serialNumbers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSmartLock });
    },
  });
};

export const useDeleteSmartLockMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSmartLockSerial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSmartLock });
    },
  });
};

export const useBulkDeleteSmartLockMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteSmartLockSerials(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serialKeys.allSmartLock });
    },
  });
};

//--
