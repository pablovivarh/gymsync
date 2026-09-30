import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CreditCard, Pencil, Plus, ShieldCheck, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, notifyDashboardRefresh } from '../lib/api';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price: number;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MembershipPlanFormState {
  name: string;
  description: string;
  duration_days: string;
  price: string;
  active: boolean;
}

const emptyForm: MembershipPlanFormState = {
  name: '',
  description: '',
  duration_days: '30',
  price: '49',
  active: true,
};

export function MembershipPlansPage(): JSX.Element {
  const { session } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Array<{ plan_id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MembershipPlanFormState>(emptyForm);

  const canManage = session?.user.role === 'ADMIN' || session?.user.role === 'RECEPCION';

  const planCounts = useMemo(() => {
    const counts = new Map<string, number>();

    memberships.forEach((membership) => {
      counts.set(membership.plan_id, (counts.get(membership.plan_id) ?? 0) + 1);
    });

    return counts;
  }, [memberships]);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [plansResponse, membershipsResponse] = await Promise.all([
        api.get('/membership-plans'),
        api.get('/memberships'),
      ]);

      setPlans(plansResponse.data.data.plans ?? []);
      setMemberships(membershipsResponse.data.data.memberships ?? []);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudieron cargar los planes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const submitPlan = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        duration_days: Number(form.duration_days),
        price: Number(form.price),
        active: form.active,
      };

      if (editingId) {
        await api.patch(`/membership-plans/${editingId}`, payload);
      } else {
        await api.post('/membership-plans', payload);
      }

      notifyDashboardRefresh();
      setForm(emptyForm);
      setEditingId(null);
      await loadData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo guardar el plan';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePlan = async (plan: MembershipPlan): Promise<void> => {
    try {
      await api.patch(`/membership-plans/${plan.id}`, { active: !plan.active });
      notifyDashboardRefresh();
      await loadData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo cambiar el estado del plan';
      setError(message);
    }
  };

  const openEdit = (plan: MembershipPlan): void => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      duration_days: String(plan.duration_days),
      price: String(plan.price),
      active: plan.active,
    });
  };

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Operación</p>
              <h1 className="text-3xl font-bold text-[#0D1B3E]">Planes</h1>
            </div>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C]"
            >
              <Plus className="h-4 w-4" />
              Nuevo plan
            </button>
          ) : null}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total planes</p>
              <CreditCard className="h-4 w-4 text-[#0D1B3E]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{plans.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Activos</p>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{plans.filter((plan) => plan.active).length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Socios asociados</p>
              <Users className="h-4 w-4 text-[#0D1B3E]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{memberships.length}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Cargando planes...</div>
            ) : plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No hay planes creados todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${plan.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {plan.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{plan.description ?? 'Sin descripción'}</p>
                      </div>

                      {canManage ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(plan)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void togglePlan(plan)}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white bg-[#0D1B3E] hover:bg-[#142B5C]"
                          >
                            {plan.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            {plan.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Precio</p>
                        <p className="mt-1 font-semibold">{plan.price} €</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Duración</p>
                        <p className="mt-1 font-semibold">{plan.duration_days} días</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Socios</p>
                        <p className="mt-1 font-semibold">{planCounts.get(plan.id) ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0D1B3E]">{editingId ? 'Editar plan' : 'Nuevo plan'}</h2>

              {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

              <form className="mt-4 space-y-4" onSubmit={submitPlan}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E] focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E] focus:bg-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Duración (días)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.duration_days}
                      onChange={(event) => setForm((current) => ({ ...current, duration_days: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Precio</label>
                    <input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                  <select
                    value={form.active ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === 'ACTIVE' }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E] focus:bg-white"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear plan'}
                  </button>

                  {editingId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm(emptyForm);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
