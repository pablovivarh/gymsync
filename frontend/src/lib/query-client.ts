/**
 * frontend/src/lib/query-client.ts
 *
 * Instancia global de TanStack Query.
 * Configuración conservadora para V1:
 * - retry: 1 reintento en queries fallidas (no en mutaciones)
 * - staleTime: 30s — los datos del servidor se consideran frescos 30s
 * - gcTime: 5min — el cache se limpia tras 5 min sin observadores
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,       // 30 segundos
      gcTime: 5 * 60_000,      // 5 minutos
      refetchOnWindowFocus: false, // evitar refetches inesperados
    },
    mutations: {
      retry: 0, // nunca reintentar mutaciones automáticamente
    },
  },
});
