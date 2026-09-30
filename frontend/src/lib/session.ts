export type Role = 'ADMIN' | 'RECEPCION' | 'ENTRENADOR';

export interface AuthUser {
  id: string;
  nombre_completo: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

const STORAGE_KEYS = {
  accessToken: 'gymsync.accessToken',
  user: 'gymsync.user',
} as const;

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function readStoredSession(): AuthSession | null {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem(STORAGE_KEYS.user);
  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    return { accessToken, user };
  } catch {
    clearSession();
    return null;
  }
}

export function persistSession(accessToken: string, user: AuthUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.user);
}
