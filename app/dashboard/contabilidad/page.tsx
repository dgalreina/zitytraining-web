'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
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
  const [search, setSearch] = useState('');
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

  const visibleClients = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    if (!query) return data.clients;
    return data.clients.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query));
  }, [data, search]);

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

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-10 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#2b2b2a]"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* Un unico contenedor con scroll en los dos ejes: lo que se queda
          quieto lo hace con "position: sticky" sobre las propias celdas
          (nunca sobre <thead>/<tr>, que Safari ignora). Asi no hay nada
          que sincronizar a mano y es imposible que las columnas se
          desalineen mientras se arrastra.

          "isolate" encierra los z-index de las celdas fijas en su propio
          contexto: si no, competirian con el resto de la app y la
          cabecera se colaba por encima del menu lateral.

          "overscroll-none" quita el rebote de iOS al arrastrar mas alla
          del borde: durante ese rebote el scroll ya esta a 0 y no puede
          ir a menos, asi que las celdas sticky no tienen a que
          reaccionar y se despegan con el contenido. */}
      <div
        ref={tableWrapRef}
        className="relative isolate overflow-auto overscroll-none rounded-2xl border border-gray-200 bg-white shadow-sm"
        style={topOffset !== null ? { maxHeight: `calc(100dvh - ${topOffset}px)` } : undefined}
      >
        {!data ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : visibleClients.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">
            {search.trim() ? 'Ningún cliente coincide con la búsqueda.' : 'No hay clientes que mostrar.'}
          </p>
        ) : (
          <table className="w-max border-separate border-spacing-0">
            <colgroup>
              <col className={CLIENT_COL_CLASS} />
              {days.map((day) => (
                <col key={day} style={{ width: DAY_WIDTH }} />
              ))}
              <col className={TOTAL_COL_CLASS} />
            </colgroup>

            <thead>
              <tr>
                <th
                  className={`sticky left-0 top-0 z-30 h-[52px] ${CLIENT_COL_CLASS} border-b border-r border-gray-200 bg-white px-3 text-left sm:px-4`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Cliente</span>
                </th>
                {days.map((day) => {
                  const wd = new Date(year, month - 1, day).getDay();
                  const isWeekend = wd === 0 || wd === 6;
                  return (
                    <th
                      key={day}
                      className="sticky top-0 z-20 h-[52px] border-b border-gray-200 p-0 font-normal"
                      style={{ width: DAY_WIDTH, background: isWeekend ? '#f9f9f7' : '#ffffff' }}
                    >
                      <span className="block text-[9px] font-bold uppercase text-gray-300">{WEEKDAY_LETTERS[wd]}</span>
                      <span className="block text-xs font-bold text-[#2b2b2a]">{day}</span>
                    </th>
                  );
                })}
                <th
                  className={`sticky right-0 top-0 z-30 h-[52px] ${TOTAL_COL_CLASS} border-b border-l border-gray-200 bg-white px-2`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Total mes</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleClients.map((client) => (
                <Fragment key={client.clientId}>
                  <tr>
                    <td
                      rowSpan={2}
                      className={`sticky left-0 z-10 ${CLIENT_COL_CLASS} max-w-0 border-b border-r border-gray-200 bg-white px-3 sm:px-4`}
                    >
                      <p className="truncate font-[family-name:var(--font-work-sans)] text-[13px] font-bold text-[#2b2b2a]">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-[11px] text-[#868585]">
                        {client.inactive && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#868585]">
                            Baja
                          </span>
                        )}
                        <span className="truncate">{client.sessionCount} sesiones este mes</span>
                      </p>
                    </td>

                    {/* Las franjas de plan van sobre un lienzo del ancho
                        exacto del mes, cada una colocada por su dia: un
                        hueco o un solape en los datos no puede estirar
                        la fila mas alla del mes. */}
                    <td colSpan={data.daysInMonth} className="h-[22px] p-0 align-top">
                      <div className="relative h-[22px] overflow-hidden" style={{ width: data.daysInMonth * DAY_WIDTH }}>
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
                    </td>

                    <td
                      rowSpan={2}
                      className={`sticky right-0 z-10 ${TOTAL_COL_CLASS} border-b border-l border-gray-200 bg-white p-0`}
                    >
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="flex h-[74px] w-full flex-col items-center justify-center gap-1 px-2 hover:bg-gray-50"
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
                    </td>
                  </tr>

                  <tr>
                    {client.days.map((d) => (
                      <td
                        key={d.day}
                        className="border-b border-r border-gray-50 p-0"
                        style={{ width: DAY_WIDTH, background: d.holiday ? '#fffbeb' : '#ffffff' }}
                      >
                        <div className="flex h-[52px] items-center justify-center">
                          {d.holiday ? (
                            <span className="rounded-[4px] bg-amber-200 px-1 text-[7px] font-bold text-amber-800">
                              F
                            </span>
                          ) : d.hasClass ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#6aa842]" />
                          ) : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
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
