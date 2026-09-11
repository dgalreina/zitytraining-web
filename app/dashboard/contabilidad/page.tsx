'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAccountingMonth, AccountingMonth, AccountingClientMonth } from '@/lib/accountingApi';
import { COLOR_PALETTE } from '@/lib/colors';
import MonthBreakdownModal from './MonthBreakdownModal';

const DAY_WIDTH = 40;
const CLIENT_COL_CLASS = 'w-[108px] sm:w-[236px]';
const TOTAL_COL_CLASS = 'w-[80px] sm:w-[132px]';
const WEEKDAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const FREE_SESSIONS_COLOR = '#868585';

function monthLabel(year: number, month: number) {
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ContabilidadPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [data, setData] = useState<AccountingMonth | null>(null);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<AccountingClientMonth | null>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    getAccountingMonth(token, year, month)
      .then(setData)
      .catch((err) => setError(err.message || 'No se pudo cargar Contabilidad'));
  }, [year, month, router]);

  // Igual que en Entrenamientos/Fichar: solo la tabla hace scroll, no la
  // página entera (el contenedor del dashboard ya hace overflow-y-auto).
  useEffect(() => {
    function recalcOffset() {
      const el = tableWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 24;
      setTopOffset(top + BOTTOM_GAP);
    }
    recalcOffset();
    window.addEventListener('resize', recalcOffset);
    return () => window.removeEventListener('resize', recalcOffset);
  }, []);

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

  // Un color estable por etiqueta de plan (mismo color cada vez que
  // aparece esa etiqueta en la página); sesiones libres siempre en gris.
  const colorForLabel = useMemo(() => {
    const assigned = new Map<string, string>();
    let next = 0;
    return (label: string, isFreeSessions: boolean) => {
      if (isFreeSessions) return FREE_SESSIONS_COLOR;
      if (!assigned.has(label)) {
        assigned.set(label, COLOR_PALETTE[next % COLOR_PALETTE.length].value);
        next += 1;
      }
      return assigned.get(label)!;
    };
  }, [data]);

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          <Wallet size={20} />
          Contabilidad
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#868585]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#6aa842]" />
              Con clase
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-amber-100" />
              Festivo
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
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
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div
        ref={tableWrapRef}
        className="relative overflow-auto overscroll-contain rounded-2xl border border-gray-200 bg-white shadow-sm"
        style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
      >
        {!data ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : data.clients.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No hay clientes que mostrar.</p>
        ) : (
          <div className="inline-flex min-w-full flex-col">
            {/* Cabecera: dias */}
            <div className="sticky top-0 z-30 flex border-b border-gray-200 bg-white">
              <div className={`sticky left-0 z-10 flex ${CLIENT_COL_CLASS} shrink-0 items-center border-r border-gray-200 bg-white px-3 sm:px-4`}>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Cliente</span>
              </div>
              {days.map((day) => {
                const wd = new Date(year, month - 1, day).getDay();
                const isWeekend = wd === 0 || wd === 6;
                return (
                  <div
                    key={day}
                    className="flex shrink-0 flex-col items-center justify-center gap-0.5 py-2"
                    style={{ width: DAY_WIDTH, background: isWeekend ? '#f9f9f7' : '#ffffff' }}
                  >
                    <span className="text-[9px] font-bold uppercase text-gray-300">{WEEKDAY_LETTERS[wd]}</span>
                    <span className="text-xs font-bold text-[#2b2b2a]">{day}</span>
                  </div>
                );
              })}
              <div className={`sticky right-0 z-10 flex ${TOTAL_COL_CLASS} shrink-0 items-center justify-center border-l border-gray-200 bg-white px-2 text-center`}>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Total mes</span>
              </div>
            </div>

            {/* Filas */}
            {data.clients.map((client) => (
              <div key={client.clientId} className="flex border-b border-gray-50">
                <div className={`sticky left-0 z-20 flex ${CLIENT_COL_CLASS} shrink-0 flex-col justify-center gap-0.5 border-r border-gray-200 bg-white px-3 py-2.5 sm:px-4`}>
                  <p className="truncate font-[family-name:var(--font-work-sans)] text-[13px] font-bold text-[#2b2b2a]">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="truncate text-[11px] text-[#868585]">{client.sessionCount} sesiones este mes</p>
                </div>

                <div className="flex flex-col">
                  <div className="flex h-[22px] items-center pt-1.5">
                    {client.segments.map((seg, i) => {
                      const widthPx = (seg.toDay - seg.fromDay + 1) * DAY_WIDTH;
                      const color = colorForLabel(seg.label, seg.isFreeSessions);
                      return (
                        <div
                          key={i}
                          className="mx-px flex h-4 shrink-0 items-center overflow-hidden rounded-md pl-2"
                          style={{ width: widthPx, background: color }}
                        >
                          {widthPx >= 70 && (
                            <span className="truncate text-[9px] font-bold uppercase tracking-wide text-white">
                              {seg.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex h-[52px]">
                    {client.days.map((d) => (
                      <div
                        key={d.day}
                        className="flex shrink-0 items-center justify-center border-r border-gray-50"
                        style={{
                          width: DAY_WIDTH,
                          background: d.holiday ? '#fffbeb' : '#ffffff',
                        }}
                      >
                        {d.holiday ? (
                          <span className="rounded-[4px] bg-amber-200 px-1 text-[7px] font-bold text-amber-800">
                            F
                          </span>
                        ) : d.hasClass ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-[#6aa842]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedClient(client)}
                  className={`sticky right-0 z-20 flex ${TOTAL_COL_CLASS} shrink-0 flex-col items-center justify-center gap-1 border-l border-gray-200 bg-white px-2 py-2.5 hover:bg-gray-50`}
                >
                  <span className="font-[family-name:var(--font-work-sans)] text-[15px] font-bold text-[#4b7a1f]">
                    {client.due}€
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      client.payment.received
                        ? 'bg-[#a2c037]/15 text-[#4b7a1f]'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {client.payment.received ? 'Recibido' : 'Pendiente'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && data && (
        <MonthBreakdownModal
          client={selectedClient}
          year={data.year}
          month={data.month}
          segmentColor={colorForLabel}
          onClose={() => setSelectedClient(null)}
          onSaved={(payment) => {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    clients: prev.clients.map((c) =>
                      c.clientId === selectedClient.clientId ? { ...c, payment } : c,
                    ),
                  }
                : prev,
            );
            setSelectedClient((prev) => (prev ? { ...prev, payment } : prev));
          }}
        />
      )}
    </div>
  );
}
