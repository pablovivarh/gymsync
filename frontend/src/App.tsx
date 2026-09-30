/**
 * frontend/src/App.tsx
 *
 * Router principal de la SPA.
 * Fase 1: autenticación del staff con rutas públicas y privadas.
 */
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { HealthPage } from './pages/HealthPage';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { MembershipPlansPage } from './pages/MembershipPlansPage';
import { MembershipsPage } from './pages/MembershipsPage';

function PublicRoute(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando sesión...</div>;
  }

  return session ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function ProtectedRoute(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Verificando acceso...</div>;
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function StaffRoute(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Verificando permisos...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return session.user.role === 'ADMIN' || session.user.role === 'RECEPCION' || session.user.role === 'ENTRENADOR'
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
}

function AdminRoute(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Verificando permisos...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return session.user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function RootRoute(): JSX.Element {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando sesión...</div>;
  }

  return <Navigate to={session ? '/dashboard' : '/login'} replace />;
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/health" element={<HealthPage />} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/memberships" element={<MembershipsPage />} />
        <Route path="/membership-plans" element={<MembershipPlansPage />} />
      </Route>

      <Route element={<StaffRoute />}>
        <Route path="/members" element={<MembersPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/employees" element={<EmployeesPage />} />
      </Route>

      <Route path="/" element={<RootRoute />} />
      <Route path="*" element={<RootRoute />} />
    </Routes>
  );
}
