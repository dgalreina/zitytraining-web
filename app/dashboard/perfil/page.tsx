'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, KeyRound, Pencil } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import { getMe, updateMe } from '@/lib/api';
import { DEFAULT_TRAINER_COLOR, getAvatarGradient } from '@/lib/colors';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

const COLOR_PALETTE = [
  { name: 'Verde (marca)', value: '#6aa842' },
  { name: 'Naranja', value: '#e8821e' },
  { name: 'Marrón', value: '#a4796c' },
  { name: 'Azul cielo', value: '#29abe2' },
  { name: 'Mostaza', value: '#e4b443' },
  { name: 'Turquesa', value: '#16a394' },
  { name: 'Azul marino', value: '#2e5f8a' },
  { name: 'Morado', value: '#7e57c2' },
  { name: 'Beige', value: '#c2a878' },
  { name: 'Gris pizarra', value: '#64748b' },
];

export default function PerfilPage() {
  const [form, setForm] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initials, setInitials] = useState('');
  const [isTrainer, setIsTrainer] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getMe(token)
      .then((user) => {
        const dateOfBirth = user.dateOfBirth?.split('T')[0] ?? '';
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth,
          email: user.email,
          phone: user.phone,
          address: user.address,
          color: user.color || null,
        };
        setForm(data);
        setOriginal(data);
        setInitials(`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`);
        setIsTrainer(user.roles?.includes('trainer') ?? false);
      })
      .catch(() => setError('No se pudo cargar tu perfil'))
      .finally(() => setLoading(false));
  }, [router]);

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
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const updated = await updateMe(token, form);
      const data = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        color: updated.color || null,
      };
      setForm(data);
      setOriginal(data);
      setEditing(false);

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...currentUser,
            firstName: data.firstName,
            lastName: data.lastName,
            color: data.color,
          }),
        );
        // Avisa al layout (donde vive el círculo de arriba) para que se actualice al instante
        window.dispatchEvent(new Event('zity-user-updated'));
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar tu perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: getAvatarGradient(form.color) }}
            >
              {initials}
            </div>
            <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
              Mi perfil
            </h2>
          </div>

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

          {isTrainer && (
            <div>
              <label className={labelClass}>Color en el calendario</label>
              <div className="flex flex-wrap gap-2.5">
                {!form.color && (
                  <button
                    type="button"
                    title="Sin asignar (gris)"
                    disabled={!editing}
                    onClick={() => setForm({ ...form, color: null })}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-gray-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: DEFAULT_TRAINER_COLOR }}
                  >
                    <Check size={16} className="text-white" />
                  </button>
                )}
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    disabled={!editing}
                    onClick={() => setForm({ ...form, color: c.value })}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ backgroundColor: c.value }}
                  >
                    {form.color === c.value && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#868585]">
                Por defecto es gris. Elige un color para identificar tus sesiones en el calendario.
              </p>
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

        <div className="mt-5 border-t border-gray-100 pt-4">
          <Link
            href="/dashboard/perfil/contrasena"
            className="flex items-center gap-1.5 text-sm font-semibold text-[#868585] hover:text-[#2b2b2a]"
          >
            <KeyRound size={14} />
            Cambiar contraseña
          </Link>
        </div>
      </div>
    </div>
  );
}