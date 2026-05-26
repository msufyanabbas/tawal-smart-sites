import apiClient from './apiClient';
import { ApiResponse, AppUser, AuthUser, Role } from '../types';

interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

interface ChangePasswordPayload {
  token: string;
  newPassword: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  isApproved?: boolean;
}
type UpdateUserPayload = Partial<CreateUserPayload>;

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

// ── Auth ────────────────────────────────────────────────────────────────────

export const loginUser = (payload: LoginPayload) =>
  unwrap<LoginResponse>(apiClient.post('/auth/login', payload));

export const requestPasswordReset = (email: string) =>
  unwrap(apiClient.post('/auth/forgot-password', { email }));

export const changePassword = (payload: ChangePasswordPayload) =>
  unwrap(apiClient.post('/auth/change-password', payload));

// ── Admin user CRUD ────────────────────────────────────────────────────────

export const listUsers = (role?: Role) =>
  unwrap<AppUser[]>(
    apiClient.get('/users', { params: role ? { role } : undefined }),
  );

export const getUser = (id: string) =>
  unwrap<AppUser>(apiClient.get(`/users/${id}`));

export const createUser = (payload: CreateUserPayload) =>
  unwrap<AppUser>(apiClient.post('/users', payload));

export const updateUser = (id: string, payload: UpdateUserPayload) =>
  unwrap<AppUser>(apiClient.patch(`/users/${id}`, payload));

export const deleteUser = (id: string) =>
  unwrap<{ deleted: boolean }>(apiClient.delete(`/users/${id}`));
