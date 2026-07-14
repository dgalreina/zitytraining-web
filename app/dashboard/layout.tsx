'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Users,
  Dumbbell,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';

const ADMIN_ONLY_PREFIXES = [
  '/dashboard/calendario',
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    let admin = false;

    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserName(`${parsed.firstName} ${parsed.lastName}`);
      setInitials(`${parsed.firstName?.[0] ?? ''}${parsed.lastName?.[0] ?? ''}`);
      admin = parsed.roles?.includes('admin') ?? false;
      setIsAdmin(admin);
    }

    const isBlockedRoute = ADMIN_ONLY_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if (!admin && isBlockedRoute) {
      router.push('/dashboard');
      return;
    }

    setReady(true);
  }, [router, pathname]);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/mi-calendario', label: 'Mi Calendario', icon: CalendarClock },
    ...(isAdmin
      ? [
          { href: '/dashboard/calendario', label: 'Calendario', icon: CalendarDays },
          { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
          { href: '/dashboard/entrenadores', label: 'Entrenadores', icon: Dumbbell },
          { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: BarChart3 },
        ]
      : []),
  ];

  if (!ready) return null;

  return (
    <div className="flex min-h-screen bg-[#f7f7f5] font-[family-name:var(--font-inter)]">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white px-3 py-5">
        <div className="mb-6 px-2">
          <Image
            src="/logo-color.png"
            alt="Zitytraining"
            width={140}
            height={45}
            priority
          />
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
      <div className="flex-1 px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#868585]">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <h1 className="font-[family-name:var(--font-work-sans)] text-xl font-bold text-[#2b2b2a]">
              Hola, {userName.split(' ')[0]}
            </h1>
          </div>
          <Link
            href="/dashboard/perfil"
            title="Ver mi perfil"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#a2c037] to-[#6aa842] text-lg font-bold text-white transition hover:opacity-90"
          >
            {initials}
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}