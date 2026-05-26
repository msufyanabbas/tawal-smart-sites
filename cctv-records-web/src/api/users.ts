import apiClient from './client';
import type {
  AppUser,
  CreateUserPayload,
  DeleteResponse,
  Role,
  UpdateUserPayload,
} from '@/types';

export const listUsers = async (role?: Role): Promise<AppUser[]> => {
  const { data } = await apiClient.get<AppUser[]>('/users', {
    params: role ? { role } : undefined,
  });
  return data;
};

export const getUser = async (id: string): Promise<AppUser> => {
  const { data } = await apiClient.get<AppUser>(`/users/${id}`);
  return data;
};

export const createUser = async (payload: CreateUserPayload): Promise<AppUser> => {
  const { data } = await apiClient.post<AppUser>('/users', payload);
  return data;
};

export const updateUser = async (
  id: string,
  payload: UpdateUserPayload,
): Promise<AppUser> => {
  const { data } = await apiClient.patch<AppUser>(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: string): Promise<DeleteResponse> => {
  const { data } = await apiClient.delete<DeleteResponse>(`/users/${id}`);
  return data;
};
