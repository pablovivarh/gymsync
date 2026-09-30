/**
 * frontend/src/lib/api.ts
 *
 * Cliente HTTP configurado para la API de GymSync.
 * Centraliza la configuración de base URL, cabeceras por defecto
 * e interceptores para el token JWT.
 *
 * En Fase 1 (Autenticación) se añadirán:
 * - Interceptor de request para inyectar el Bearer token desde el store
 * - Interceptor de response para manejar 401 (sesión expirada)
 */
import axios from 'axios';
import { clearSession, getStoredAccessToken } from './session';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

export function notifyDashboardRefresh(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('gymsync:dashboard-refresh'));
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;

  if (currentPath === '/login') {
    return;
  }

  const target = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  window.location.assign(target);
}

api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginRequest = typeof error?.config?.url === 'string' && error.config.url.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      clearSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
