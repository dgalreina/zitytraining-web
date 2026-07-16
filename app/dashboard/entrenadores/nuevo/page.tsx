'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import { createUserByAdmin } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

export default function NuevoEntrenadorPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

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
      await createUserByAdmin(token, {
        ...form,
        roles: ['trainer'],
      });
      router.push('/dashboard/entrenadores');
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el entrenador');
    } finally {
      setSaving(false);
    }
  }

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
        <h2 className="mb-5 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Nuevo entrenador
        </h2>

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
            <DateOfBirthPicker
              value={form.dateOfBirth}
              onChange={(value) => setForm({ ...form, dateOfBirth: value })}
            />
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
            <label className={labelClass}>Dirección</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Contraseña inicial</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={4}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Crear entrenador'}
          </button>
        </form>
      </div>
    </div>
  );
}