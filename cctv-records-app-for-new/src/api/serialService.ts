import apiClient from './apiClient';
import { ApiResponse } from '../types';

export interface SerialItem {
  _id: string;
  serialNumber: string;
  createdAt: string;
}

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

export const getSimSerials = () => unwrap<SerialItem[]>(apiClient.get('/serials/sim'));
export const getRmsSerials = () => unwrap<SerialItem[]>(apiClient.get('/serials/rms'));
export const getSmartLockSerials = () => unwrap<SerialItem[]>(apiClient.get('/serials/smartlock'));
