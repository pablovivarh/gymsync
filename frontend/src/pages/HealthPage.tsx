/**
 * frontend/src/pages/HealthPage.tsx
 *
 * Página de verificación del estado del sistema.
 * Comprueba que frontend, backend y base de datos están operativos.
 * Es el primer punto de verificación de la Fase 0.
 *
 * Accesible en: http://localhost:5173/health
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Activity, Database, Globe } from 'lucide-react';
import { api } from '../lib/api';

interface HealthData {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function useApiHealth() {
  return useQuery<HealthData>({
    queryKey: ['health', 'api'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<HealthData>>('/health');
      return res.data.data;
    },
    refetchInterval: 30_000, // refetch cada 30s
  });
}

function useDbHealth() {
  return useQuery<{ status: string; database: string }>({
    queryKey: ['health', 'db'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ status: string; database: string }>>('/health/db');
      return res.data.data;
    },
    refetchInterval: 30_000,
  });
}

// ── Componente StatusCard ─────────────────────────────────────────────────────

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  status: 'ok' | 'error' | 'loading';
  detail?: string;
  delay?: number;
}

function StatusCard({ icon, title, status, detail, delay = 0 }: StatusCardProps): JSX.Element {
  const statusConfig = {
    ok:      { color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle, label: 'Operativo' },
    error:   { color: 'text-red-600',     bg: 'bg-red-50',     Icon: XCircle,     label: 'Error' },
    loading: { color: 'text-slate-400',   bg: 'bg-slate-50',   Icon: Loader2,     label: 'Comprobando...' },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-2 ${statusConfig.bg}`}>
          <span className={statusConfig.color}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <div className="mt-1 flex items-center gap-2">
            <statusConfig.Icon
              className={`h-4 w-4 ${statusConfig.color} ${status === 'loading' ? 'animate-spin' : ''}`}
            />
            <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
          </div>
          {detail && <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function HealthPage(): JSX.Element {
  const apiQuery  = useApiHealth();
  const dbQuery   = useDbHealth();

  const apiStatus  = apiQuery.isLoading ? 'loading' : apiQuery.isError ? 'error' : 'ok';
  const dbStatus   = dbQuery.isLoading  ? 'loading' : dbQuery.isError  ? 'error' : 'ok';
  const allOk      = apiStatus === 'ok' && dbStatus === 'ok';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D1B3E]">
            <Activity className="h-8 w-8 text-[#F4B942]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E]">GymSync</h1>
          <p className="mt-1 text-sm text-slate-500">Estado del sistema — Fase 0</p>
        </motion.div>

        {/* Status cards */}
        <div className="space-y-3">
          <StatusCard
            icon={<Globe className="h-5 w-5" />}
            title="Frontend React"
            status="ok"
            detail="React 18 + Vite + TanStack Query"
            delay={0}
          />
          <StatusCard
            icon={<Activity className="h-5 w-5" />}
            title="Backend API"
            status={apiStatus}
            detail={
              apiQuery.data
                ? `v${apiQuery.data.version} · ${apiQuery.data.environment}`
                : apiQuery.error
                ? 'No se puede conectar con el backend'
                : undefined
            }
            delay={0.1}
          />
          <StatusCard
            icon={<Database className="h-5 w-5" />}
            title="PostgreSQL"
            status={dbStatus}
            detail={
              dbQuery.data
                ? `${dbQuery.data.database} · conectado`
                : dbQuery.error
                ? 'No se puede conectar con la base de datos'
                : undefined
            }
            delay={0.2}
          />
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`mt-6 rounded-lg p-4 text-center text-sm font-medium ${
            allOk
              ? 'bg-emerald-50 text-emerald-700'
              : apiStatus === 'loading' || dbStatus === 'loading'
              ? 'bg-slate-100 text-slate-500'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {apiStatus === 'loading' || dbStatus === 'loading'
            ? 'Verificando servicios...'
            : allOk
            ? '✅ Todos los servicios operativos — Fase 0 completada'
            : '❌ Uno o más servicios no están disponibles'}
        </motion.div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Actualización automática cada 30 segundos
        </p>
      </div>
    </div>
  );
}
