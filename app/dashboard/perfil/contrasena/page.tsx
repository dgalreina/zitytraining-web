'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { changeMyPassword } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

// Misma regla que el backend (IsStrongPassword): al menos 8 caracteres,
// una mayúscula, una minúscula, un número y un símbolo.
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const STRONG_PASSWORD_HINT =
  'Al menos 8 caracteres, con mayúsculas, minúsculas, números y algún símbolo.';

export default function CambiarContrasenaPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Escribe tu contraseña actual');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setError(STRONG_PASSWORD_HINT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await changeMyPassword(token, { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/perfil"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-[#868585] hover:text-[#2b2b2a]"
      >
        <ChevronLeft size={16} />
        Mi perfil
      </Link>

      <div className="rounded-xl bg-white p-6">
        <h2 className="mb-5 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Cambiar contraseña
        </h2>

        {success ? (
          <p className="text-sm font-medium text-[#4b7a1f]">
            Contraseña actualizada correctamente.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                title={STRONG_PASSWORD_HINT}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#868585]">{STRONG_PASSWORD_HINT}</p>
            </div>
            <div>
              <label className={labelClass}>Repite la nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
