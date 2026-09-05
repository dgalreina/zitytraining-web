'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X } from 'lucide-react';
import { login } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();

  function closeForgotModal() {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotSent(false);
  }

  // Todavía no hay backend que mande el email de verdad; esto solo
  // recoge la dirección y lo confirma. El envío real es el siguiente
  // paso, pendiente de decidir cómo (proveedor de email, plantilla, etc.).
  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard/calendario');
    } catch (err) {
      setError('Email o contraseña incorrectos');
    }
  }

  return (
    <main className="flex min-h-screen font-[family-name:var(--font-inter)]">
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-[#a2c037] to-[#6aa842] md:flex">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full border-[40px] border-white/10" />
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full border-[50px] border-white/10" />

        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <Image
            src="/logo-white.png"
            alt="Zitytraining"
            width={360}
            height={116}
            className="mb-8"
            priority
          />
          <p className="max-w-xs text-2x1 font-[family-name:var(--font-work-sans)] font-semibold text-white/95">
            Ponte en forma con nosotros, tus objetivos son los nuestros.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#f7f7f5] px-6 md:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center md:hidden">
            <Image
              src="/logo-white.png"
              alt="Zitytraining"
              width={200}
              height={64}
              className="rounded-lg bg-gradient-to-br from-[#a2c037] to-[#6aa842] p-4"
            />
          </div>

          <div className="rounded-2xl bg-white p-10 shadow-sm">
            <h1 className="font-[family-name:var(--font-work-sans)] text-3xl font-bold text-[#2b2b2a]">
              Bienvenido
            </h1>
            <div className="mt-2 mb-8 h-1 w-12 rounded-full bg-gradient-to-r from-[#a2c037] to-[#6aa842]" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#868585]">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-[#2b2b2a] transition focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#868585]">
                  Contraseña
                </label>
                <PasswordInput
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-[#2b2b2a] transition focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="mt-1.5 text-sm font-medium text-[#6aa842] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                className="mt-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-3 font-[family-name:var(--font-work-sans)] font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
              >
                Entrar
              </button>
            </form>

            {error && (
              <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeForgotModal}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Recuperar contraseña
              </h3>
              <button onClick={closeForgotModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <p className="text-sm font-medium text-[#4b7a1f]">
                Si ese email está registrado, te enviaremos instrucciones para recuperar tu
                contraseña.
              </p>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#868585]">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}