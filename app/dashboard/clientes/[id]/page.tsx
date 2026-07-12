'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X } from 'lucide-react';
import { getUser, updateUser, approveUser, rejectUser } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
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

export default function DetalleClientePage() {
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getUser(token, id)
      .then((user) => {
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth?.split('T')[0] ?? '',
          email: user.email,
          phone: user.phone,
          address: user.address,
          membershipNumber: user.membershipNumber || '',
          status: user.status,
        });
      })
      .catch(() => setError('No se pudo cargar el cliente'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const { status, ...data } = form;
      await updateUser(token, id, {
        ...data,
        membershipNumber: data.membershipNumber || undefined,
      });
      router.push('/dashboard/clientes');
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await approveUser(token, id);
    setForm({ ...form, status: 'active' });
  }

  async function handleReject() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await rejectUser(token, id);
    setForm({ ...form, status: 'rejected' });
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/clientes"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      <div className="rounded-xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
            {form.firstName} {form.lastName}
          </h2>
          <div className="flex items-center gap-2">
            {statusBadge(form.status)}
            {form.status === 'pending' && (
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
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
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha de nacimiento</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nº de socio</label>
              <input
                name="membershipNumber"
                value={form.membershipNumber}
                onChange={handleChange}
                placeholder="SOC-0001"
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
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}