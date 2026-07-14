import apiClient from './client';
import type {
  SimSerial,
  RmsSerial,
  BulkSerialResult,
  BulkDeleteResult,
} from '@/types';

// ── SIM serials ───────────────────────────────────────────────────────────────

export const listSimSerials = async (): Promise<SimSerial[]> => {
  const { data } = await apiClient.get<SimSerial[]>('/serials/sim');
  return data;
};

export const createSimSerial = async (serialNumber: string): Promise<SimSerial> => {
  const { data } = await apiClient.post<SimSerial>('/serials/sim', { serialNumber });
  return data;
};

export const bulkCreateSimSerials = async (
  serialNumbers: string[],
): Promise<BulkSerialResult> => {
  const { data } = await apiClient.post<BulkSerialResult>('/serials/sim/bulk', {
    serialNumbers,
  });
  return data;
};

export const deleteSimSerial = async (id: string): Promise<void> => {
  await apiClient.delete(`/serials/sim/${id}`);
};

export const bulkDeleteSimSerials = async (
  ids: string[],
): Promise<BulkDeleteResult> => {
  const { data } = await apiClient.delete<BulkDeleteResult>('/serials/sim/bulk', {
    data: { ids },
  });
  return data;
};

// ── RMS serials ───────────────────────────────────────────────────────────────

export const listRmsSerials = async (): Promise<RmsSerial[]> => {
  const { data } = await apiClient.get<RmsSerial[]>('/serials/rms');
  return data;
};

export const createRmsSerial = async (serialNumber: string): Promise<RmsSerial> => {
  const { data } = await apiClient.post<RmsSerial>('/serials/rms', { serialNumber });
  return data;
};

export const bulkCreateRmsSerials = async (
  serialNumbers: string[],
): Promise<BulkSerialResult> => {
  const { data } = await apiClient.post<BulkSerialResult>('/serials/rms/bulk', {
    serialNumbers,
  });
  return data;
};

export const deleteRmsSerial = async (id: string): Promise<void> => {
  await apiClient.delete(`/serials/rms/${id}`);
};

export const bulkDeleteRmsSerials = async (
  ids: string[],
): Promise<BulkDeleteResult> => {
  const { data } = await apiClient.delete<BulkDeleteResult>('/serials/rms/bulk', {
    data: { ids },
  });
  return data;
};
