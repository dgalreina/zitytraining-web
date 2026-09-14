'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/lib/authApi';
import { STRONG_PASSWORD_REGEX } from '@/lib/validation';
import PasswordInput from '@/components/PasswordInput';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== repeat) {
      setError('Las dos contraseñas no coinciden');
      return;
    }
    // Se comprueba aquí además de en el servidor para avisar al momento,
    // sin gastar el enlace en un intento que se sabe que va a fallar.
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError(
        'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas, números y algún símbolo',
      );
      return;
    }

    setSaving(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">
          Este enlace no es válido. Pide uno nuevo desde &quot;¿Olvidaste tu contraseña?&quot;.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-center font-semibold text-white transition hover:opacity-90"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-medium text-[#4b7a1f]">
          <CheckCircle2 size={18} />
          Contraseña cambiada.
        </p>
        <p className="text-sm text-[#868585]">
          Se han cerrado las sesiones que tuvieras abiertas, así que tendrás que entrar de nuevo
          en tus dispositivos.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#868585]">Nueva contraseña</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#868585]">Repítela</label>
        <PasswordInput
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <p className="text-xs text-[#868585]">
        Mínimo 8 caracteres, con mayúsculas, minúsculas, números y algún símbolo.
      </p>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 font-[family-name:var(--font-inter)]">
      <div className="w-full max-w-sm">
        <Image
          src="/logo-color.png"
          alt="Zitytraining"
          width={260}
          height={84}
          className="mx-auto mb-8"
          priority
        />
        <h1 className="mb-6 text-center font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Elige una nueva contraseña
        </h1>
        {/* useSearchParams obliga a envolver en Suspense al compilar. */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
