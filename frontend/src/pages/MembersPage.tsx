import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Pencil, Plus, Search, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type MemberStatus = 'ACTIVE' | 'INACTIVE';

interface Member {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  document_id: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  status: MemberStatus;
  joined_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MembershipSummary {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  price: number;
}

interface MemberFormState {
  full_name: string;
  phone: string;
  email: string;
  document_id: string;
  birth_date: string;
  address: string;
  notes: string;
  status: MemberStatus;
}

const emptyForm: MemberFormState = {
  full_name: '',
  phone: '',
  email: '',
  document_id: '',
  birth_date: '',
  address: '',
  notes: '',
  status: 'ACTIVE',
};

export function MembersPage(): JSX.Element {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberMemberships, setMemberMemberships] = useState<MembershipSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormState>(emptyForm);

  const canEdit = session?.user.role === 'ADMIN' || session?.user.role === 'RECEPCION';
  const isStaffRole = session?.user.role === 'ADMIN' || session?.user.role === 'RECEPCION' || session?.user.role === 'ENTRENADOR';

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedId) ?? members[0] ?? null,
    [members, selectedId]
  );

  const loadMembers = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (query.trim()) params.search = query.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const response = await api.get('/members', { params });
      setMembers(response.data.data.members ?? []);
      setError('');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudieron cargar los socios';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberMemberships([]);
      return;
    }

    const loadMemberMemberships = async (): Promise<void> => {
      try {
        const response = await api.get(`/members/${selectedMember.id}/memberships`);
        setMemberMemberships(response.data.data.memberships ?? []);
      } catch {
        setMemberMemberships([]);
      }
    };

    void loadMemberMemberships();
  }, [selectedMember]);

  if (!session || !isStaffRole) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">No tienes permisos para gestionar socios.</div>;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        document_id: form.document_id || null,
        birth_date: form.birth_date || null,
        address: form.address || null,
        notes: form.notes || null,
        status: form.status,
      };

      if (editingId) {
        await api.patch(`/members/${editingId}`, payload);
      } else {
        await api.post('/members', payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadMembers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo guardar el socio';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateForm = (): void => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEditForm = (member: Member): void => {
    setEditingId(member.id);
    setSelectedId(member.id);
    setForm({
      full_name: member.full_name,
      phone: member.phone,
      email: member.email ?? '',
      document_id: member.document_id ?? '',
      birth_date: member.birth_date ?? '',
      address: member.address ?? '',
      notes: member.notes ?? '',
      status: member.status,
    });
  };

  const toggleStatus = async (member: Member): Promise<void> => {
    const nextStatus: MemberStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/members/${member.id}/status`, { status: nextStatus });
      await loadMembers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo cambiar el estado';
      setError(message);
    }
  };

  const softDelete = async (memberId: string): Promise<void> => {
    try {
      await api.delete(`/members/${memberId}`);
      await loadMembers();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'No se pudo eliminar el socio';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
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
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Operación</p>
              <h1 className="text-3xl font-bold text-[#0D1B3E]">Socios</h1>
            </div>
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B3E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142B5C]"
            >
              <Plus className="h-4 w-4" />
              Nuevo socio
            </button>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre, teléfono o email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as MemberStatus | 'ALL')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Cargando socios...</div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No hay socios que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${selectedMember?.id === member.id ? 'border-[#0D1B3E] bg-slate-50' : 'border-slate-200'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(member.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-lg font-semibold text-slate-900">{member.full_name}</p>
                      <p className="text-sm text-slate-500">{member.phone}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{member.email ?? 'Sin email'}</span>
                        <span className={`rounded-full px-2 py-1 ${member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {member.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </button>

                    {canEdit ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(member)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(member)}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white ${member.status === 'ACTIVE' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                          {member.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          {member.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void softDelete(member.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Baja
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[#0D1B3E]">
              <Shield className="h-5 w-5" />
              <h2 className="text-lg font-semibold">{editingId ? 'Editar socio' : 'Nuevo socio'}</h2>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Documento</label>
                  <input
                    value={form.document_id}
                    onChange={(event) => setForm((current) => ({ ...current, document_id: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
                <input
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MemberStatus }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0D1B3E] focus:bg-white"
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
                  {isSubmitting ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear socio'}
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

            {selectedMember ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <Eye className="h-4 w-4" />
                  <p className="text-sm font-semibold">Ficha operativa</p>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <p><span className="font-medium">Nombre:</span> {selectedMember.full_name}</p>
                  <p><span className="font-medium">Teléfono:</span> {selectedMember.phone}</p>
                  <p><span className="font-medium">Email:</span> {selectedMember.email ?? 'Sin email'}</p>
                  <p><span className="font-medium">Documento:</span> {selectedMember.document_id ?? 'Sin documento'}</p>
                  <p><span className="font-medium">Fecha de alta:</span> {selectedMember.joined_at}</p>
                  <p><span className="font-medium">Estado:</span> {selectedMember.status}</p>
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600">
                  {memberMemberships.length === 0 ? (
                    <span>Sin membresía registrada aún.</span>
                  ) : (
                    <div className="space-y-2">
                      {memberMemberships.map((membership) => (
                        <div key={membership.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p><span className="font-medium">Estado:</span> {membership.status}</p>
                          <p><span className="font-medium">Inicio:</span> {membership.start_date}</p>
                          <p><span className="font-medium">Fin:</span> {membership.end_date}</p>
                          <p><span className="font-medium">Importe:</span> {membership.price} €</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
