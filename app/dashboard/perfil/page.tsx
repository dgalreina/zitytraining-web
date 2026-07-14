'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getMe, updateMe } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

export default function PerfilPage() {
  const [form, setForm] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initials, setInitials] = useState('');
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
        };
        setForm(data);
        setOriginal(data);
        setDob(dateOfBirth ? new Date(dateOfBirth) : null);
        setInitials(`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`);
      })
      .catch(() => setError('No se pudo cargar tu perfil'))
      .finally(() => setLoading(false));
  }, [router]);

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
      const updated = await updateMe(token, form);
      const data = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
      };
      setForm(data);
      setOriginal(data);
      setEditing(false);

      // mantiene sincronizado el nombre mostrado en la cabecera del layout
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        localStorage.setItem(
          'user',
          JSON.stringify({ ...currentUser, firstName: data.firstName, lastName: data.lastName }),
        );
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
    <div className="max-w-2xl">
      <div className="rounded-xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#a2c037] to-[#6aa842] text-sm font-bold text-white">
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