'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  Dumbbell,
  BarChart3,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const ADMIN_ONLY_PREFIXES = [
  '/dashboard/clientes',
  '/dashboard/entrenadores',
  '/dashboard/estadisticas',
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [initials, setInitials] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    let admin = false;
    let trainer = false;
    let client = false;

    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserName(`${parsed.firstName} ${parsed.lastName}`);
      setInitials(`${parsed.firstName?.[0] ?? ''}${parsed.lastName?.[0] ?? ''}`);
      admin = parsed.roles?.includes('admin') ?? false;
      trainer = parsed.roles?.includes('trainer') ?? false;
      client = parsed.roles?.includes('client') ?? false;
      setIsAdmin(admin);
      setIsTrainer(trainer);
      setIsClient(client);
    }

    const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if (!admin && isAdminOnlyRoute) {
      router.push('/dashboard');
      return;
    }

    setReady(true);
  }, [router, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/calendario', label: 'Calendario', icon: CalendarClock },
    ...(isClient
      ? [{ href: '/dashboard/pagos', label: 'Planes', icon: Tag }]
      : []),
    ...(isAdmin
      ? [
          { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
          { href: '/dashboard/entrenadores', label: 'Entrenadores', icon: Dumbbell },
          { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: BarChart3 },
        ]
      : []),
  ];

  if (!ready) return null;

  return (
    <div className="flex min-h-screen bg-[#f7f7f5] font-[family-name:var(--font-inter)]">
      {/* Fondo oscuro tras el panel, solo móvil, solo cuando está abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar: fijo en desktop, panel deslizante en móvil */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-gray-200 bg-white px-3 py-5 transition-transform duration-300 md:static md:w-56 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Image
            src="/logo-color.png"
            alt="Zitytraining"
            width={140}
            height={45}
            priority
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-l-[3px] border-[#6aa842] bg-gradient-to-r from-[#a2c037]/10 to-[#6aa842]/10 text-[#4b7a1f]'
                    : 'text-[#868585] hover:bg-gray-50'
                }`}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-gray-100 pt-3">
          <Link
            href="/dashboard/ajustes"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50"
          >
            <Settings size={17} />
            Ajustes
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-400 hover:bg-gray-50"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#2b2b2a] md:hidden"
            >
              <Menu size={24} />
            </button>
            <div>
              <p className="text-xs font-semibold text-[#868585]">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <h1 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a] sm:text-xl">
                Hola, {userName.split(' ')[0]}
              </h1>
            </div>
          </div>
          <Link
            href="/dashboard/perfil"
            title="Ver mi perfil"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a2c037] to-[#6aa842] text-base font-bold text-white transition hover:opacity-90 sm:h-14 sm:w-14 sm:text-lg"
          >
            {initials}
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}