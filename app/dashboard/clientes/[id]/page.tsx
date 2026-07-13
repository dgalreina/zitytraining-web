'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, Pencil } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getUser, updateUser, approveUser, rejectUser } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    pending: 'bg-amber-100 text-amber-700',
    inactive: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    pending: 'Pendiente',
    inactive: 'Inactivo',
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
  const [original, setOriginal] = useState<any>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
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
        const dateOfBirth = user.dateOfBirth?.split('T')[0] ?? '';
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth,
          email: user.email,
          phone: user.phone,
          address: user.address,
          membershipNumber: user.membershipNumber || '',
          status: user.status,
        };
        setForm(data);
        setOriginal(data);
        setDob(dateOfBirth ? new Date(dateOfBirth) : null);
      })
      .catch(() => setError('No se pudo cargar el cliente'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleDobChange(date: Date | null) {
    setDob(date);
    setForm({
      ...form,
      dateOfBirth: date ? date.toISOString().split('T')[0] : '',
    });
  }

  function handleToggleStatus() {
    setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' });
  }

  function handleCancel() {
    setForm(original);
    setDob(original.dateOfBirth ? new Date(original.dateOfBirth) : null);
    setError('');
    setEditing(false);
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
      const updated = await updateUser(token, id, {
        ...form,
        membershipNumber: form.membershipNumber || undefined,
      });
      const data = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        membershipNumber: updated.membershipNumber || '',
        status: updated.status,
      };
      setForm(data);
      setOriginal(data);
      setEditing(false);
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
    setOriginal({ ...original, status: 'active' });
  }

  async function handleReject() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await rejectUser(token, id);
    setForm({ ...form, status: 'rejected' });
    setOriginal({ ...original, status: 'rejected' });
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

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                <Pencil size={13} />
                Editar
              </button>
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
            <div>
              <label className={labelClass}>Fecha de nacimiento</label>
              <DatePicker
                selected={dob}
                onChange={handleDobChange}
                dateFormat="dd/MM/yyyy"
                showYearDropdown
                yearDropdownItemNumber={80}
                scrollableYearDropdown
                placeholderText="Selecciona una fecha"
                className={inputClass}
                wrapperClassName="w-full"
                disabled={!editing}
                required
              />
            </div>
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

          {editing && (form.status === 'active' || form.status === 'inactive') && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#2b2b2a]">
                  {form.status === 'active' ? 'Cuenta activa' : 'Cuenta inactiva'}
                </p>
                <p className="text-xs text-[#868585]">
                  {form.status === 'active'
                    ? 'El cliente puede acceder con normalidad.'
                    : 'El cliente está pausado y no puede acceder.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.status === 'active'}
                onClick={handleToggleStatus}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
                  form.status === 'active' ? 'bg-[#6aa842]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
                    form.status === 'active' ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          {editing && (
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
    </div>
  );
}