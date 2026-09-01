'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
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
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-[#2b2b2a] transition focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
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
    </main>
  );
}