import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CreditCard, DollarSign, LogOut, ShieldCheck, User2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface MemberSummary {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface MembershipSummary {
  id: string;
  member_id: string;
  plan_id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  end_date: string;
  price: number;
}

interface OperationalAlert {
  id: string;
  title: string;
  description: string;
  scope: string;
  count: number;
  priority: 'urgente' | 'importante' | 'informativa';
  recommendedAction: string;
  route: string;
  category: string;
}

interface OperationalTask {
  id: string;
  title: string;
  description: string;
  priority: 'urgente' | 'importante' | 'informativa';
  route: string;
  kind: string;
}

interface OperationalSummary {
  totals: {
    activeMembers: number;
    activeMemberships: number;
    totalRevenue: number;
  };
  alerts: OperationalAlert[];
  tasks: OperationalTask[];
}

export function DashboardPage(): JSX.Element {
  const { session, logout } = useAuth();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [operationalSummary, setOperationalSummary] = useState<OperationalSummary | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;

    const loadSummary = async (): Promise<void> => {
      try {
        const [membersResponse, membershipsResponse, dashboardResponse] = await Promise.all([
          api.get('/members'),
          api.get('/memberships'),
          api.get('/dashboard/operational'),
        ]);

        if (!isMounted) {
          return;
        }

        setMembers(membersResponse.data.data.members ?? []);
        setMemberships(membershipsResponse.data.data.memberships ?? []);
        setOperationalSummary(dashboardResponse.data.data.summary ?? null);
      } catch {
        if (isMounted) {
          setMembers([]);
          setMemberships([]);
          setOperationalSummary(null);
        }
      }
    };

    const handleDashboardRefresh = (): void => {
      void loadSummary();
    };

    void loadSummary();
    window.addEventListener('gymsync:dashboard-refresh', handleDashboardRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('gymsync:dashboard-refresh', handleDashboardRefresh);
    };
  }, [session]);

  const stats = useMemo(() => {
    const activeMembers =
      operationalSummary?.totals.activeMembers ?? members.filter((member) => member.status === 'ACTIVE').length;
    const activeMemberships =
      operationalSummary?.totals.activeMemberships ?? memberships.filter((membership) => membership.status === 'ACTIVE').length;
    const expiringSoon = memberships.filter((membership) => {
      const endDate = new Date(membership.end_date);
      const upcoming = new Date();
      upcoming.setDate(upcoming.getDate() + 30);
      return membership.status === 'ACTIVE' && endDate <= upcoming;
    }).length;
    const totalRevenue = operationalSummary?.totals.totalRevenue ?? 0;

    return {
      activeMembers,
      activeMemberships,
      expiringSoon,
      totalRevenue,
    };
  }, [members, memberships, operationalSummary]);

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Panel</p>
            <h1 className="mt-2 text-3xl font-bold text-[#0D1B3E]">Bienvenido</h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Socios activos</p>
              <Users className="h-4 w-4 text-[#0D1B3E]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.activeMembers}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Membresías activas</p>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.activeMemberships}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Próximas a vencer</p>
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.expiringSoon}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Ingresos</p>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.totalRevenue} €</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0D1B3E] p-2 text-[#F4B942]">
                <User2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Usuario</p>
                <p className="text-lg font-semibold text-slate-900">{session.user.nombre_completo}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#0D1B3E] p-2 text-[#F4B942]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Rol</p>
                <p className="text-lg font-semibold text-slate-900">{session.user.role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-200 p-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-800">Requiere atención</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Alertas operativas</h2>
            </div>
          </div>

          {!operationalSummary || operationalSummary.alerts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No hay alertas pendientes en este momento.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {operationalSummary.alerts.map((alert) => (
                <Link key={alert.id} to={alert.route} className="rounded-2xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <span className={
                      `rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        alert.priority === 'urgente'
                          ? 'bg-red-100 text-red-700'
                          : alert.priority === 'importante'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-sky-100 text-sky-700'
                      }`
                    }>
                      {alert.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{alert.description}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">Afecta a: {alert.scope}</p>
                  <p className="mt-2 text-xs text-slate-600">Acción recomendada: {alert.recommendedAction}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">{alert.count} elementos</p>
                </Link>
              ))}
            </div>
          )}

          {operationalSummary && operationalSummary.tasks.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-800">Tareas internas</p>
              <ul className="mt-3 space-y-2">
                {operationalSummary.tasks.slice(0, 4).map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                    </div>
                    <span className={
                      `rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === 'urgente'
                          ? 'bg-red-100 text-red-700'
                          : task.priority === 'importante'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-sky-100 text-sky-700'
                      }`
                    }>
                      {task.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Socios</p>
                <p className="mt-1 text-sm text-slate-600">Consulta y gestiona el listado de socios.</p>
              </div>
              <Link to="/members" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <Users className="h-4 w-4" />
                Ver socios
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Membresías</p>
                <p className="mt-1 text-sm text-slate-600">Comprueba estado, fechas y pagos asociados.</p>
              </div>
              <Link to="/memberships" className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142B5C]">
                <CreditCard className="h-4 w-4" />
                Ver membresías
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Planes</p>
                <p className="mt-1 text-sm text-slate-600">Gestiona precios, duración y activación.</p>
              </div>
              <Link to="/membership-plans" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                <CreditCard className="h-4 w-4" />
                Ver planes
              </Link>
            </div>
          </div>
        </div>

        {(session.user.role === 'ADMIN' || session.user.role === 'RECEPCION') ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Gestión de personal</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/employees" className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#142B5C]">
                <Users className="h-4 w-4" />
                Empleados
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Sesión activa</p>
          <p className="mt-2">{session.user.email}</p>
        </div>
      </div>
    </div>
  );
}
