'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { changeMyPassword } from '@/lib/usersApi';
import { logout } from '@/lib/authApi';
import PasswordInput from '@/components/PasswordInput';
import { inputClass, labelClass } from '@/lib/formStyles';
import { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_HINT } from '@/lib/validation';

// Primer acceso de quien entra con la contraseña que le dio el admin. No
// es la misma pantalla que la del perfil: aquí no hay a dónde volver, y
// el API le rechaza cualquier otra cosa hasta que elija una suya.
export default function CambiarContrasenaObligatorioPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!localStorage.getItem('token') || !storedUser) {
      router.push('/login');
      return;
    }
    // Quien ya la ha cambiado no pinta nada aquí.
    if (!JSON.parse(storedUser).mustChangePassword) {
      router.push('/dashboard/calendario');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Escribe la contraseña con la que has entrado');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      setError(STRONG_PASSWORD_HINT);
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña tiene que ser distinta de la actual');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    try {
      await changeMyPassword(token, { currentPassword, newPassword });
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        localStorage.setItem(
          'user',
          JSON.stringify({ ...JSON.parse(storedUser), mustChangePassword: false }),
        );
      }
      router.push('/dashboard/calendario');
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await logout(refreshToken);
    localStorage.clear();
    router.push('/login');
  }

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
        <h1 className="mb-2 text-center font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Elige tu contraseña
        </h1>
        <p className="mb-6 text-center text-sm text-[#868585]">
          Entraste con la que te dieron al darte de alta. Escoge una tuya para continuar.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Contraseña con la que has entrado</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Nueva contraseña</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Repite la nueva</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <p className="text-xs text-[#868585]">{STRONG_PASSWORD_HINT}</p>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar y entrar'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
