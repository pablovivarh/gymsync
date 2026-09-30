import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Role = 'ADMIN' | 'RECEPCION' | 'ENTRENADOR';
type Status = 'ACTIVE' | 'INACTIVE';

interface Employee {
  id: string;
  nombre_completo: string;
  email: string;
  role: Role;
  status: Status;
  telefono: string | null;
  direccion_postal: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeFormState {
  nombre_completo: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
}

const emptyForm: EmployeeFormState = {
  nombre_completo: '',
  email: '',
  password: '',
  role: 'RECEPCION',
  status: 'ACTIVE',
};

export function EmployeesPage(): JSX.Element {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);

  const filteredEmployees = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return employees;
    }

    return employees.filter((employee) =>
      employee.nombre_completo.toLowerCase().includes(needle) || employee.email.toLowerCase().includes(needle)
    );
  }, [employees, query]);

  const loadEmployees = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.get('/employees');
      setEmployees(response.data.data.employees ?? []);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'No se pudieron cargar los empleados';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  if (!session || session.user.role !== 'ADMIN') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">No tienes permisos para administrar empleados.</div>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        ...(editingId ? {} : { password: form.password }),
      };

      if (editingId) {
        await api.patch(`/employees/${editingId}`, {
          nombre_completo: form.nombre_completo,
          email: form.email,
          role: form.role,
          status: form.status,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.post('/employees', payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadEmployees();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'No se pudo guardar el empleado';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateForm = (): void => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEditForm = (employee: Employee): void => {
    setEditingId(employee.id);
    setForm({
      nombre_completo: employee.nombre_completo,
      email: employee.email,
      password: '',
      role: employee.role,
      status: employee.status,
    });
  };

  const toggleStatus = async (employee: Employee): Promise<void> => {
    const nextStatus: Status = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/employees/${employee.id}/status`, { status: nextStatus });
      await loadEmployees();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'No se pudo cambiar el estado';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Staff</p>
              <h1 className="text-3xl font-bold text-[#0D1B3E]">Empleados</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C]"
          >
            <Plus className="h-4 w-4" />
            Nuevo empleado
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre o correo"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Cargando empleados...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No hay empleados que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{employee.nombre_completo}</p>
                      <p className="text-sm text-slate-500">{employee.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{employee.role}</span>
                        <span className={`rounded-full px-2 py-1 ${employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(employee)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleStatus(employee)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white ${employee.status === 'ACTIVE' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                        {employee.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        {employee.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[#0D1B3E]">
              <Shield className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{editingId ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  value={form.nombre_completo}
                  onChange={(event) => setForm((current) => ({ ...current, nombre_completo: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  required
                />
              </div>

              {!editingId ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                    required
                  />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="RECEPCION">RECEPCION</option>
                    <option value="ENTRENADOR">ENTRENADOR</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Status }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear empleado'}
                </button>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
