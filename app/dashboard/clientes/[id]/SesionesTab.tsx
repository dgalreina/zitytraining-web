'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getBookings, Booking } from '@/lib/bookingsApi';
import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';

function monthLabel(year: number, month: number) {
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSessionDate(date: Date) {
  const dateStr = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr.charAt(0).toUpperCase()}${dateStr.slice(1)} · ${timeStr}`;
}

// Igual que el calendario: cancelada pesa más que "no cuenta por festivo",
// que a su vez pesa más que una sesión normal.
function sessionStatusBadge(b: Booking) {
  if (b.status === 'cancelled') {
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        Cancelada
      </span>
    );
  }
  if (b.holidaySkip) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        No cuenta (festivo)
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[#a2c037]/15 px-2.5 py-1 text-xs font-semibold text-[#4b7a1f]">
      Impartida
    </span>
  );
}

export default function SesionesTab({ id }: { id: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setBookings(null);
    setError('');

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);
    getBookings(token, { client: id, from: from.toISOString(), to: to.toISOString() })
      .then((data) => {
        data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setBookings(data);
      })
      .catch(() => setError('No se pudieron cargar las sesiones'));
  }, [id, year, month]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-1 self-center rounded-lg border border-gray-200 bg-white p-1">
        <button
          onClick={() => changeMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-gray-100"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="font-[family-name:var(--font-work-sans)] px-1 text-[13px] font-bold text-[#2b2b2a]">
          {monthLabel(year, month)}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-gray-100"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="rounded-xl bg-white p-6">
        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : bookings === null ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-gray-400">No hay sesiones este mes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <div key={b._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm text-[#2b2b2a]">{formatSessionDate(new Date(b.startTime))}</span>
                  <span className="flex items-center gap-1.5 truncate text-xs font-medium text-[#868585]">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: b.trainer?.color || DEFAULT_TRAINER_COLOR }}
                    />
                    {b.trainer ? `${b.trainer.firstName} ${b.trainer.lastName}` : 'Entrenador'}
                  </span>
                </div>
                {sessionStatusBadge(b)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
