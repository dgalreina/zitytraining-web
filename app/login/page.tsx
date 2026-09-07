'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X } from 'lucide-react';
import { login, debugLog as logAuthEvent } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

// TODO: quitar este bloque de depuración (DEBUG_LOG_KEY, debugLog, el
// useEffect que lo lee y el <pre> que lo pinta) en cuanto se localice
// por qué a veces se cierra la sesión sola. Sirve para ver en el propio
// móvil (sin consola a mano) si localStorage estaba vacío o el token
// realmente había caducado justo antes de que nos mandara aquí.
const DEBUG_LOG_KEY = 'debug_auth_log';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [debugLog, setDebugLog] = useState<string | null>(null);
  const [debugNow, setDebugNow] = useState<Record<string, boolean> | null>(null);
  // Empieza en true para no pintar el formulario ni un instante si
  // resulta que ya hay sesión guardada (evita el parpadeo antes de
  // mandar al calendario). Se pasa a false solo si de verdad hace
  // falta iniciar sesión.
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Si llegamos aquí con una sesión perfectamente válida (ej. iOS
    // abriendo la PWA directamente en /login porque fue la URL que
    // quedó guardada al "Añadir a pantalla de inicio"), no tiene
    // sentido mostrar el formulario: nos vamos derechos al calendario.
    const token = localStorage.getItem('token');
    if (token) {
      logAuthEvent('login_page_con_sesion_valida', { redirigido: '/dashboard/calendario' });
      router.push('/dashboard/calendario');
      return;
    }

    // Esto se ve SIEMPRE, aunque el propio log se haya borrado: si el
    // sistema operativo vació todo el localStorage (ej. al cerrar la
    // app en iOS), el log de abajo desaparecería con él, y sin esto no
    // habría forma de distinguir "no ha pasado nada" de "se borró todo".
    setDebugNow({
      token: !!localStorage.getItem('token'),
      refreshToken: !!localStorage.getItem('refreshToken'),
      user: !!localStorage.getItem('user'),
      debug_auth_log: !!localStorage.getItem(DEBUG_LOG_KEY),
    });
    const raw = localStorage.getItem(DEBUG_LOG_KEY);
    setDebugLog(raw);
    setCheckingAuth(false);
  }, [router]);

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
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard/calendario');
    } catch (err) {
      setError('Email o contraseña incorrectos');
    }
  }

  if (checkingAuth) return null;

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

          {debugNow && (
            <div className="mt-4 rounded-xl bg-[#2b2b2a] p-4 text-white">
              <p className="mb-1 text-xs font-bold uppercase text-gray-400">
                Debug: estado ahora mismo
              </p>
              <p className="text-[11px] leading-relaxed text-[#a2c037]">
                token: {debugNow.token ? 'sí' : 'NO (vacío)'} · refreshToken:{' '}
                {debugNow.refreshToken ? 'sí' : 'NO (vacío)'} · user: {debugNow.user ? 'sí' : 'NO (vacío)'}
              </p>
              {!debugNow.debug_auth_log && (
                <p className="mt-1 text-[11px] text-amber-400">
                  El historial de abajo tampoco existe: si esto pasó justo después de cerrar la
                  app, todo el localStorage se vació de golpe (no es un 401 nuestro, se borró
                  entero).
                </p>
              )}
            </div>
          )}

          {debugLog && (
            <div className="mt-4 rounded-xl bg-[#2b2b2a] p-4 text-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-gray-400">
                  Debug: por qué te ha sacado
                </p>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('debug_auth_log');
                    setDebugLog(null);
                  }}
                  className="text-xs font-semibold text-gray-400 underline"
                >
                  Borrar
                </button>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word text-[10px] leading-relaxed text-[#a2c037]">
                {JSON.stringify(JSON.parse(debugLog), null, 2)}
              </pre>
            </div>
          )}
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