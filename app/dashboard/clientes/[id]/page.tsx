'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Pencil } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import { getUser, updateUser, approveUser, rejectUser, getClientPurchases } from '@/lib/api';

type Tab = 'info' | 'plan' | 'historial';

const tabs: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Información' },
  { id: 'plan', label: 'Plan activo' },
  { id: 'historial', label: 'Historial' },
];

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    pending: 'Pendiente',
    rejected: 'Rechazado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function purchaseStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente de confirmar',
    active: 'Activo',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DetalleClientePage() {
  const [tab, setTab] = useState<Tab>('info');
  const [form, setForm] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchases, setPurchases] = useState<any[] | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }

    const admin = storedUser ? JSON.parse(storedUser).roles?.includes('admin') : false;
    setIsAdmin(admin);

    getUser(token, id)
      .then((user) => {
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth?.split('T')[0] ?? '',
          email: user.email,
          phone: user.phone,
          address: user.address,
          membershipNumber: user.membershipNumber || '',
          status: user.status,
        };
        setForm(data);
        setOriginal(data);
      })
      .catch(() => setError('No se pudo cargar el cliente'))
      .finally(() => setLoading(false));

    getClientPurchases(token, id)
      .then(setPurchases)
      .catch(() => setPurchases([]));
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCancel() {
    setForm(original);
    setError('');
    setEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { status, ...data } = form;
      const updated = await updateUser(token, id, {
        ...data,
        membershipNumber: data.membershipNumber || undefined,
      });
      const newData = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        membershipNumber: updated.membershipNumber || '',
        status: updated.status,
      };
      setForm(newData);
      setOriginal(newData);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    await approveUser(token, id);
    setForm({ ...form, status: 'active' });
    setOriginal({ ...original, status: 'active' });
  }

  async function handleReject() {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    await rejectUser(token, id);
    setForm({ ...form, status: 'rejected' });
    setOriginal({ ...original, status: 'rejected' });
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  const activeItems = purchases?.filter((p) => p.status === 'active') || [];

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/clientes"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          {form.firstName} {form.lastName}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(form.status)}

          {isAdmin && form.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                title="Aprobar"
                className="rounded-lg bg-[#a2c037]/15 p-1.5 text-[#4b7a1f] hover:bg-[#a2c037]/25"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleReject}
                title="Rechazar"
                className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
                : 'text-[#868585] hover:text-[#2b2b2a]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h-[calc(100dvh-260px)] overflow-y-auto pr-1">
        {tab === 'info' && (
          <div className="rounded-xl bg-white p-6">
            {isAdmin && !editing && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                >
                  <Pencil size={13} />
                  Editar
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Apellidos</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DateOfBirthPicker
                  value={form.dateOfBirth}
                  onChange={(value) => setForm({ ...form, dateOfBirth: value })}
                  disabled={!editing}
                />
                <div>
                  <label className={labelClass}>Nº de socio</label>
                  <input
                    name="membershipNumber"
                    value={form.membershipNumber}
                    onChange={handleChange}
                    placeholder="SOC-0001"
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  disabled={!editing}
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              {isAdmin && editing && (
                <div className="mt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-lg bg-gray-100 px-5 py-2.5 font-semibold text-[#2b2b2a] hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {tab === 'plan' && (
          <div className="rounded-xl bg-white p-6">
            {purchases === null ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : activeItems.length === 0 ? (
              <p className="text-sm text-gray-400">
                Este cliente no tiene ningún plan o servicio activo.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {activeItems.map((item) => (
                  <div key={item._id} className="rounded-lg border border-gray-100 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#2b2b2a]">
                        {item.itemLabel}
                      </span>
                      {purchaseStatusBadge(item.status)}
                    </div>
                    <p className="text-lg font-bold text-[#4b7a1f]">
                      {item.price}€
                      {item.paymentMode === 'monthly' && (
                        <span className="text-xs font-normal text-[#868585]"> /mes</span>
                      )}
                    </p>
                    {item.sessionCount && (
                      <p className="text-xs text-[#868585]">
                        Bono de {item.sessionCount} sesiones
                      </p>
                    )}
                    {item.activatedAt && (
                      <p className="mt-1 text-xs text-[#868585]">
                        Activo desde el{' '}
                        {new Date(item.activatedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'historial' && (
          <div className="overflow-hidden rounded-xl bg-white">
            {purchases === null ? (
              <p className="p-6 text-sm text-gray-400">Cargando...</p>
            ) : purchases.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Todavía no hay pagos registrados.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-[#868585]">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Concepto</th>
                    <th className="px-5 py-3">Importe</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p._id} className="border-b border-gray-50">
                      <td className="px-5 py-3 text-[#868585]">
                        {new Date(p.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#2b2b2a]">{p.itemLabel}</td>
                      <td className="px-5 py-3 text-[#868585]">{p.price}€</td>
                      <td className="px-5 py-3">{purchaseStatusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}