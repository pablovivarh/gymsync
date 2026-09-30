/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { api } from '../lib/api';
import { clearSession, persistSession, readStoredSession, type AuthSession, type AuthUser } from '../lib/session';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const currentSession = readStoredSession();

    if (!currentSession) {
      setSession(null);
      return null;
    }

    try {
      const response = await api.get('/auth/me');
      const user = response.data.data.user as AuthUser;
      const nextSession = { accessToken: currentSession.accessToken, user };
      persistSession(nextSession.accessToken, user);
      setSession(nextSession);
      return user;
    } catch {
      clearSession();
      setSession(null);
      return null;
    }
  }, []);

  const login = useCallback(async ({ email, password }: LoginCredentials): Promise<AuthUser> => {
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data.data as { accessToken: string; user: AuthUser };
    const nextSession = {
      accessToken: payload.accessToken,
      user: payload.user,
    };

    persistSession(nextSession.accessToken, nextSession.user);
    setSession(nextSession);

    return nextSession.user;
  }, []);

  const logout = useCallback((): void => {
    clearSession();
    setSession(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        const storedSession = readStoredSession();
        if (!storedSession) {
          if (isMounted) {
            setSession(null);
            setIsLoading(false);
          }
          return;
        }

        const response = await api.get('/auth/me');
        const user = response.data.data.user as AuthUser;
        const nextSession = { accessToken: storedSession.accessToken, user };
        persistSession(nextSession.accessToken, user);

        if (isMounted) {
          setSession(nextSession);
        }
      } catch {
        clearSession();
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: Boolean(session),
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
