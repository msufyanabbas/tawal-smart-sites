import apiClient from './client';
import type { LoginResponse, MessageResponse } from '@/types';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
};

export const requestPasswordReset = async (email: string): Promise<MessageResponse> => {
  const { data } = await apiClient.post<MessageResponse>('/auth/forgot-password', { email });
  return data;
};

export const changePassword = async (
  token: string,
  newPassword: string,
): Promise<MessageResponse> => {
  const { data } = await apiClient.post<MessageResponse>('/auth/change-password', {
    token,
    newPassword,
  });
  return data;
};
