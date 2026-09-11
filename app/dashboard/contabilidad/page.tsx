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
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const midHeaderRef = useRef<HTMLDivElement>(null);
  const midBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const syncingVRef = useRef(false);
  const syncingHRef = useRef(false);
  const router = useRouter();

  // La cabecera (fila de "Cliente"/días/"Total mes") vive fuera de
  // cualquier contenedor con scroll vertical: así nunca necesita
  // "position: sticky" combinado con scroll (que es justo lo que fallaba
  // en Safari). Cliente/días/total son 3 cuerpos con su propio scroll
  // vertical cada uno (obligado por CSS: una columna con overflow-x
  // distinto de "visible" no puede dejar overflow-y en "visible"),
  // sincronizados a mano, como los paneles congelados de una hoja de
  // cálculo. La cabecera de días tiene además su propio scroll
  // horizontal, sincronizado con el del cuerpo de días.
  function syncVerticalScroll(source: HTMLDivElement) {
    if (syncingVRef.current) return;
    syncingVRef.current = true;
    const top = source.scrollTop;
    [leftBodyRef, midBodyRef, rightBodyRef].forEach((ref) => {
      if (ref.current && ref.current !== source) ref.current.scrollTop = top;
    });
    syncingVRef.current = false;
  }

  function syncHorizontalScroll(source: HTMLDivElement) {
    if (syncingHRef.current) return;
    syncingHRef.current = true;
    const left = source.scrollLeft;
    [midHeaderRef, midBodyRef].forEach((ref) => {
      if (ref.current && ref.current !== source) ref.current.scrollLeft = left;
    });
    syncingHRef.current = false;
  }

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
        className="relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
      >
        {!data ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : data.clients.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No hay clientes que mostrar.</p>
        ) : (
          <>
            {/* Columna de cliente: cabecera fija (no forma parte de ningún
                scroll) + cuerpo con su propio scroll vertical, fuera del
                scroll horizontal por completo. */}
            <div className={`flex ${CLIENT_COL_CLASS} shrink-0 flex-col border-r border-gray-200`}>
              <div className="flex h-[52px] shrink-0 items-center border-b border-gray-200 bg-white px-3 sm:px-4">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Cliente</span>
              </div>
              <div
                ref={leftBodyRef}
                onScroll={(e) => syncVerticalScroll(e.currentTarget)}
                className="overflow-y-auto"
              >
                {data.clients.map((client) => (
                  <div
                    key={client.clientId}
                    className="flex h-[74px] shrink-0 flex-col justify-center gap-0.5 border-b border-gray-50 bg-white px-3 py-2.5 sm:px-4"
                  >
                    <p className="truncate font-[family-name:var(--font-work-sans)] text-[13px] font-bold text-[#2b2b2a]">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="truncate text-[11px] text-[#868585]">{client.sessionCount} sesiones este mes</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna de dias: cabecera con su propio scroll horizontal
                (sincronizado con el del cuerpo, nunca con scroll vertical
                propio) + cuerpo con scroll en las dos direcciones. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div
                ref={midHeaderRef}
                onScroll={(e) => syncHorizontalScroll(e.currentTarget)}
                className="overflow-x-auto overflow-y-hidden overscroll-x-contain"
              >
                <div className="flex h-[52px] border-b border-gray-200 bg-white" style={{ width: data.daysInMonth * DAY_WIDTH }}>
                  {days.map((day) => {
                    const wd = new Date(year, month - 1, day).getDay();
                    const isWeekend = wd === 0 || wd === 6;
                    return (
                      <div
                        key={day}
                        className="flex shrink-0 flex-col items-center justify-center gap-0.5"
                        style={{ width: DAY_WIDTH, background: isWeekend ? '#f9f9f7' : '#ffffff' }}
                      >
                        <span className="text-[9px] font-bold uppercase text-gray-300">{WEEKDAY_LETTERS[wd]}</span>
                        <span className="text-xs font-bold text-[#2b2b2a]">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                ref={midBodyRef}
                onScroll={(e) => {
                  syncVerticalScroll(e.currentTarget);
                  syncHorizontalScroll(e.currentTarget);
                }}
                className="overflow-auto overscroll-contain"
              >
                <div style={{ width: data.daysInMonth * DAY_WIDTH }}>
                {data.clients.map((client) => (
                  <div key={client.clientId} className="flex h-[74px] flex-col border-b border-gray-50">
                    {/* Ancho fijo = días del mes, cada franja posicionada por
                        su día exacto: así un hueco o un solape en los datos
                        no puede hacer la fila más ancha que el propio mes. */}
                    <div className="relative h-[22px] shrink-0 overflow-hidden pt-1.5">
                      {client.segments.map((seg, i) => {
                        const leftPx = (seg.fromDay - 1) * DAY_WIDTH;
                        const widthPx = (seg.toDay - seg.fromDay + 1) * DAY_WIDTH;
                        const color = colorForLabel(seg.label, seg.isFreeSessions);
                        return (
                          <div
                            key={i}
                            className="absolute flex h-4 items-center overflow-hidden rounded-md pl-2"
                            style={{ left: leftPx + 1, top: 6, width: Math.max(widthPx - 2, 0), background: color }}
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
                ))}
                </div>
              </div>
            </div>

            {/* Columna de total: igual que la de cliente, cabecera fija +
                cuerpo con su propio scroll vertical. */}
            <div className={`flex ${TOTAL_COL_CLASS} shrink-0 flex-col border-l border-gray-200`}>
              <div className="flex h-[52px] shrink-0 items-center justify-center border-b border-gray-200 bg-white px-2 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Total mes</span>
              </div>
              <div
                ref={rightBodyRef}
                onScroll={(e) => syncVerticalScroll(e.currentTarget)}
                className="overflow-y-auto"
              >
                {data.clients.map((client) => (
                  <button
                    key={client.clientId}
                    onClick={() => setSelectedClient(client)}
                    className="flex h-[74px] w-full shrink-0 flex-col items-center justify-center gap-1 border-b border-gray-50 bg-white px-2 hover:bg-gray-50"
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
                ))}
              </div>
            </div>
          </>
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
