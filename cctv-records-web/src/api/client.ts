import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'auth_user';

// External logout hook — AuthProvider registers itself here so the interceptor
// can clear React state without importing the context (avoids a cycle).
let externalLogout: (() => void) | null = null;
export const setExternalLogout = (fn: () => void) => {
  externalLogout = fn;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ access_token: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
    );
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config ?? {}) as RetryableRequest;
    const url = originalRequest.url ?? '';

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (error.response?.status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Coalesce parallel 401s so we only attempt one refresh round-trip.
    if (!refreshInFlight) refreshInFlight = performRefresh();
    const newToken = await refreshInFlight;
    refreshInFlight = null;

    if (!newToken) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      externalLogout?.();
      return Promise.reject(error);
    }

    originalRequest.headers = { ...(originalRequest.headers ?? {}), Authorization: `Bearer ${newToken}` };
    return apiClient(originalRequest);
  },
);

export default apiClient;
