import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// PRD_New V3 §Platform-Wide.1: Fix unexpected logout mid-session.
// On ANY 401, attempt ONE refresh before clearing the session.
// This prevents mid-session logouts caused by timing issues.
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
  const newToken = res.data.accessToken;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', newToken);
  }
  return newToken;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    // PRD_New V3: attempt refresh on ANY 401 (not just TOKEN_EXPIRED)
    if (error.response?.status === 401 && !original._retry && typeof window !== 'undefined') {
      original._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = doRefresh().finally(() => { isRefreshing = false; });
        }
        const newToken = await refreshPromise!;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          const current = window.location.pathname;
          if (!current.startsWith('/login') && !current.startsWith('/admin/login')) {
            const isAdmin = current.startsWith('/admin');
            window.location.href = isAdmin ? '/admin/login' : `/login?redirect=${encodeURIComponent(current)}`;
          }
        }
        return Promise.reject(error);
      }
    }

    // For role-changed / user-gone errors, clear and redirect
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      if (code && ['USER_GONE', 'ROLE_CHANGED', 'REFRESH_EXPIRED', 'REFRESH_INVALID'].includes(code)) {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          const current = window.location.pathname;
          if (!current.startsWith('/login') && !current.startsWith('/admin/login')) {
            const isAdmin = current.startsWith('/admin');
            window.location.href = isAdmin ? '/admin/login' : '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export const apiClient = {
  get: <T = any>(url: string, params?: any) => api.get<T>(url, { params }).then((r) => r.data),
  post: <T = any>(url: string, body?: any, config?: any) => api.post<T>(url, body, config).then((r) => r.data),
  patch: <T = any>(url: string, body?: any, config?: any) => api.patch<T>(url, body, config).then((r) => r.data),
  delete: <T = any>(url: string) => api.delete<T>(url).then((r) => r.data),
  upload: <T = any>(url: string, formData: FormData, method: 'post' | 'patch' = 'post') =>
    (method === 'post' ? api.post<T>(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                       : api.patch<T>(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    ).then((r) => r.data),
};
