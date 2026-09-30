import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  CreditCard,
  DollarSign,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, notifyDashboardRefresh } from '../lib/api';

interface Member {
  id: string;
  full_name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  active: boolean;
}

interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  price: number;
}

interface Payment {
  id: string;
  membership_id: string;
  amount: number;
  payment_date: string;
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'BANK' | 'OTHER';
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED';
  reference: string | null;
}

const statusClasses: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

export function MembershipsPage(): JSX.Element {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [paymentsByMembership, setPaymentsByMembership] = useState<Record<string, Payment[]>>({});
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '0',
    method: 'CASH',
    status: 'PAID',
    reference: '',
    notes: '',
  });

  const canManage = session?.user.role === 'ADMIN' || session?.user.role === 'RECEPCION';

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [membershipsResponse, membersResponse, plansResponse] = await Promise.all([
        api.get('/memberships'),
        api.get('/members'),
        api.get('/membership-plans'),
      ]);

      const nextMemberships = membershipsResponse.data.data.memberships ?? [];
      const nextMembers = membersResponse.data.data.members ?? [];
      const nextPlans = plansResponse.data.data.plans ?? [];

      setMemberships(nextMemberships);
      setMembers(nextMembers);
      setPlans(nextPlans);
      setSelectedMembershipId((current) => current ?? nextMemberships[0]?.id ?? null);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudieron cargar las membresías';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.id === selectedMembershipId) ?? memberships[0] ?? null,
    [memberships, selectedMembershipId]
  );

  useEffect(() => {
    if (!selectedMembership) {
      return;
    }

    const fetchPayments = async (): Promise<void> => {
      try {
        const response = await api.get(`/memberships/${selectedMembership.id}/payments`);
        setPaymentsByMembership((current) => ({
          ...current,
          [selectedMembership.id]: response.data.data.payments ?? [],
        }));
      } catch {
        setPaymentsByMembership((current) => ({
          ...current,
          [selectedMembership.id]: [],
        }));
      }
    };

    void fetchPayments();
  }, [selectedMembership]);

  const filteredMemberships = useMemo(() => {
    const term = query.trim().toLowerCase();

    return memberships.filter((membership) => {
      const member = members.find((item) => item.id === membership.member_id);
      const plan = plans.find((item) => item.id === membership.plan_id);
      const haystack = [member?.full_name, plan?.name, membership.status, membership.id].filter(Boolean).join(' ').toLowerCase();
      return !term || haystack.includes(term);
    });
  }, [members, memberships, plans, query]);

  const paidRevenue = useMemo(
    () =>
      Object.values(paymentsByMembership)
        .flat()
        .filter((payment) => payment.status === 'PAID')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [paymentsByMembership]
  );

  const submitPayment = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedMembership) {
      return;
    }

    setIsRecordingPayment(true);
    setError('');

    try {
      await api.post(`/memberships/${selectedMembership.id}/payments`, {
        amount: Number(paymentForm.amount),
        payment_date: new Date().toISOString().slice(0, 10),
        method: paymentForm.method,
        status: paymentForm.status,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      });

      setPaymentForm({ amount: '0', method: 'CASH', status: 'PAID', reference: '', notes: '' });
      notifyDashboardRefresh();
      await loadData();
      const response = await api.get(`/memberships/${selectedMembership.id}/payments`);
      setPaymentsByMembership((current) => ({
        ...current,
        [selectedMembership.id]: response.data.data.payments ?? [],
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo registrar el cobro';
      setError(message);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando sesión...</div>;
  }

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
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Administración</p>
              <h1 className="text-3xl font-bold text-[#0D1B3E]">Membresías</h1>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Activas</p>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{memberships.filter((item) => item.status === 'ACTIVE').length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Expiradas</p>
              <CalendarRange className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{memberships.filter((item) => item.status === 'EXPIRED').length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Cobrado</p>
              <TrendingUp className="h-4 w-4 text-[#0D1B3E]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{paidRevenue} €</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pagos</p>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{Object.values(paymentsByMembership).reduce((sum, payments) => sum + payments.length, 0)}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Busca socio, plan o estado"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Cargando membresías...</div>
            ) : filteredMemberships.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No hay membresías que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMemberships.map((membership) => {
                  const member = members.find((item) => item.id === membership.member_id);
                  const plan = plans.find((item) => item.id === membership.plan_id);

                  return (
                    <button
                      key={membership.id}
                      type="button"
                      onClick={() => setSelectedMembershipId(membership.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedMembership?.id === membership.id ? 'border-[#0D1B3E] bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{member?.full_name ?? 'Socio sin nombre'}</p>
                          <p className="text-sm text-slate-500">{plan?.name ?? 'Plan no encontrado'}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses[membership.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {membership.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-slate-500">Inicio</p>
                          <p className="mt-1 font-semibold">{membership.start_date}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-slate-500">Fin</p>
                          <p className="mt-1 font-semibold">{membership.end_date}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-slate-500">Importe</p>
                          <p className="mt-1 font-semibold">{membership.price} €</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[#0D1B3E]">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Detalle</h2>
              </div>

              {selectedMembership ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <p><span className="font-medium">Socio:</span> {members.find((member) => member.id === selectedMembership.member_id)?.full_name ?? 'Sin socio'}</p>
                  <p><span className="font-medium">Plan:</span> {plans.find((plan) => plan.id === selectedMembership.plan_id)?.name ?? 'Sin plan'}</p>
                  <p><span className="font-medium">Estado:</span> {selectedMembership.status}</p>
                  <p><span className="font-medium">Inicio:</span> {selectedMembership.start_date}</p>
                  <p><span className="font-medium">Fin:</span> {selectedMembership.end_date}</p>
                  <p><span className="font-medium">Importe:</span> {selectedMembership.price} €</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Selecciona una membresía para ver sus detalles.</p>
              )}
            </div>

            {selectedMembership && canManage ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[#0D1B3E]">Registrar cobro</h2>

                <form className="space-y-4" onSubmit={submitPayment}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Importe</label>
                    <input
                      type="number"
                      min={1}
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E]"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Método</label>
                      <select
                        value={paymentForm.method}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value as typeof current.method }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E]"
                      >
                        <option value="CASH">Efectivo</option>
                        <option value="CARD">Tarjeta</option>
                        <option value="TRANSFER">Transferencia</option>
                        <option value="BANK">Banco</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                      <select
                        value={paymentForm.status}
                        onChange={(event) => setPaymentForm((current) => ({ ...current, status: event.target.value as typeof current.status }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E]"
                      >
                        <option value="PAID">Pagado</option>
                        <option value="PENDING">Pendiente</option>
                        <option value="REFUNDED">Reembolsado</option>
                        <option value="CANCELLED">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Referencia</label>
                    <input
                      value={paymentForm.reference}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                    <textarea
                      rows={3}
                      value={paymentForm.notes}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0D1B3E]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRecordingPayment}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isRecordingPayment ? 'Guardando...' : 'Guardar cobro'}
                  </button>
                </form>
              </div>
            ) : null}

            {selectedMembership ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[#0D1B3E]">Historial de pagos</h2>
                {(paymentsByMembership[selectedMembership.id] ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">Aún no hay pagos registrados para esta membresía.</p>
                ) : (
                  <div className="space-y-2">
                    {(paymentsByMembership[selectedMembership.id] ?? []).map((payment) => (
                      <div key={payment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{payment.amount} €</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses[payment.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="mt-2">{payment.method} · {payment.payment_date}</p>
                        {payment.reference ? <p className="mt-1 text-xs text-slate-500">Ref.: {payment.reference}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
