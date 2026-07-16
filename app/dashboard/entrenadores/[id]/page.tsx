'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, ShieldAlert } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import { getUser, updateUser } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    inactive: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.inactive}`}>
      {labels[status] || status}
    </span>
  );
}

function roleBadge(isAdmin: boolean) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        isAdmin ? 'bg-[#a2c037]/15 text-[#4b7a1f]' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isAdmin ? 'Administrador' : 'Entrenador'}
    </span>
  );
}

function Switch({
  checked,
  onChange,
  activeColor = '#6aa842',
}: {
  checked: boolean;
  onChange: () => void;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
      style={{ backgroundColor: checked ? activeColor : '#d1d5db' }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default function DetalleEntrenadorPage() {
  const [form, setForm] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAdminChange, setPendingAdminChange] = useState<boolean | null>(null);
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
          status: user.status,
          roles: user.roles as string[],
        };
        setForm(data);
        setOriginal(data);
      })
      .catch(() => setError('No se pudo cargar el entrenador'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleToggleStatus() {
    setForm({ ...form, status: form.status === 'active' ? 'inactive' : 'active' });
  }

  function requestAdminToggle() {
    const isCurrentlyAdmin = form.roles.includes('admin');
    setPendingAdminChange(!isCurrentlyAdmin);
  }

  function confirmAdminToggle() {
    const roles = pendingAdminChange
      ? [...new Set([...form.roles, 'admin'])]
      : form.roles.filter((r: string) => r !== 'admin');
    setForm({ ...form, roles });
    setPendingAdminChange(null);
  }

  function cancelAdminToggle() {
    setPendingAdminChange(null);
  }

  function handleCancel() {
    setForm(original);
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
      const updated = await updateUser(token, id, form);
      const data = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        status: updated.status,
        roles: updated.roles,
      };
      setForm(data);
      setOriginal(data);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el entrenador');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  const isAdmin = form.roles.includes('admin');

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/entrenadores"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
      >
        <ArrowLeft size={16} />
        Volver a entrenadores
      </Link>

      <div className="rounded-xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
            {form.firstName} {form.lastName}
          </h2>
          <div className="flex items-center gap-2">
            {roleBadge(isAdmin)}
            {statusBadge(form.status)}

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
            <DateOfBirthPicker
              value={form.dateOfBirth}
              onChange={(value) => setForm({ ...form, dateOfBirth: value })}
              disabled={!editing}
            />
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

          {editing && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2a]">
                    {form.status === 'active' ? 'Cuenta activa' : 'Cuenta inactiva'}
                  </p>
                  <p className="text-xs text-[#868585]">
                    {form.status === 'active'
                      ? 'El entrenador puede acceder con normalidad.'
                      : 'El entrenador está pausado y no puede acceder.'}
                  </p>
                </div>
                <Switch checked={form.status === 'active'} onChange={handleToggleStatus} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2a]">Permisos de administrador</p>
                  <p className="text-xs text-[#868585]">
                    {isAdmin
                      ? 'Tiene acceso completo para gestionar la plataforma.'
                      : 'Solo tiene acceso a sus funciones de entrenador.'}
                  </p>
                </div>
                <Switch checked={isAdmin} onChange={requestAdminToggle} />
              </div>
            </>
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

      {pendingAdminChange !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-amber-600">
              <ShieldAlert size={20} />
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {pendingAdminChange
                  ? 'Conceder permisos de administrador'
                  : 'Retirar permisos de administrador'}
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">
              {pendingAdminChange
                ? `${form.firstName} podrá gestionar usuarios, aprobar clientes, crear entrenadores y acceder a toda la administración de la plataforma.`
                : `${form.firstName} perderá el acceso administrativo y solo podrá usar sus funciones de entrenador.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmAdminToggle}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Confirmar
              </button>
              <button
                onClick={cancelAdminToggle}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}