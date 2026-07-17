'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBookings } from '@/lib/api';

export default function DashboardHome() {
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [role, setRole] = useState<'trainer' | 'client' | 'admin'>('admin');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    const { id, roles } = JSON.parse(storedUser);
    const currentRole = roles?.includes('trainer')
      ? 'trainer'
      : roles?.includes('client')
        ? 'client'
        : 'admin';
    setRole(currentRole);

    if (currentRole === 'admin') return;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const params =
      currentRole === 'trainer'
        ? { trainer: id, from: start.toISOString(), to: end.toISOString() }
        : { client: id, from: start.toISOString(), to: end.toISOString() };

    getBookings(token, params)
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );
        setBookings(sorted);
      })
      .catch(() => setBookings([]));
  }, [router]);

  if (role === 'admin') {
    return (
      <div className="rounded-xl bg-white p-6">
        <p className="text-sm text-gray-400">Próximamente encontrarás aquí un resumen general.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
        Clases de hoy
      </h2>

      {bookings === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-gray-400">No tienes sesiones programadas para hoy.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const timeStr = `${start.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })} – ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

            const counterpart =
              role === 'trainer'
                ? (b.clients || [])
                    .map((c: any) => `${c.firstName} ${c.lastName?.[0] ?? ''}.`)
                    .join(', ')
                : b.trainer
                  ? `${b.trainer.firstName} ${b.trainer.lastName}`
                  : 'Entrenador';

            return (
              <div
                key={b._id}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#2b2b2a]">{timeStr}</span>
                  <span className="rounded-full bg-[#a2c037]/10 px-2.5 py-1 text-xs font-semibold text-[#4b7a1f]">
                    {counterpart}
                  </span>
                </div>
                {b.notes && <p className="text-xs text-[#868585]">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}