'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import '@/styles/fullcalendar-theme.css';
import { ChevronDown, Check } from 'lucide-react';
import { getUsers, getAllAttendance, getHolidays } from '@/lib/api';
import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';
import { dayKey } from '@/components/MiniCalendar';

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return `rgba(134, 133, 133, ${alpha})`;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatTime(date: Date | null) {
  if (!date) return '';
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// El recuadro del evento es estrecho, "10:00 - 11:30" no cabe en una
// linea: entrada y salida van apiladas, una encima de otra.
function renderEventContent(arg: any) {
  return (
    <div className="flex h-full flex-col justify-center overflow-hidden px-1 text-[10px] leading-tight">
      <span className="font-semibold">{formatTime(arg.event.start)}</span>
      <span>{formatTime(arg.event.end)}</span>
      {arg.event.extendedProps?.manual && (
        <span className="font-semibold text-blue-700">Manual</span>
      )}
    </div>
  );
}

function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color || DEFAULT_TRAINER_COLOR }}
    />
  );
}

function TrainerDropdown({
  trainers,
  value,
  onChange,
}: {
  trainers: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = trainers.find((t) => t._id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none sm:w-64"
      >
        <span className="flex items-center gap-2 truncate">
          {selected && <ColorDot color={selected.color} />}
          {selected ? `${selected.firstName} ${selected.lastName}` : 'Selecciona un entrenador'}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1.5 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {trainers.map((t) => (
            <button
              key={t._id}
              type="button"
              onClick={() => {
                onChange(t._id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                t._id === value ? 'bg-[#a2c037]/10 font-semibold text-[#4b7a1f]' : 'text-[#2b2b2a] hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <ColorDot color={t.color} />
                {t.firstName} {t.lastName}
              </span>
              {t._id === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WeeklyAttendanceCalendar() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<FullCalendar>(null);
  // Igual que en Calendario: deslizamiento congelado de la semana vieja
  // hacia fuera y la nueva hacia dentro al cambiar de semana.
  const pendingSlideDirectionRef = useRef<1 | -1 | null>(null);
  const slideCloneRef = useRef<HTMLElement | null>(null);
  // Igual que en Calendario: "YYYY-MM-DD" -> nombre del festivo.
  const [holidaysByDate, setHolidaysByDate] = useState<Record<string, string>>({});
  const loadedHolidayYearsRef = useRef<Set<number>>(new Set());

  function loadHolidaysForYear(year: number) {
    if (loadedHolidayYearsRef.current.has(year)) return;
    loadedHolidayYearsRef.current.add(year);
    const token = localStorage.getItem('token');
    if (!token) return;
    getHolidays(token, year)
      .then((data: any[]) => {
        setHolidaysByDate((prev) => {
          const next = { ...prev };
          data.forEach((h) => {
            next[h.date.slice(0, 10)] = h.name;
          });
          return next;
        });
      })
      .catch(() => {
        loadedHolidayYearsRef.current.delete(year);
      });
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getUsers(token)
      .then((users) => {
        const onlyTrainers = users.filter((u: any) => u.roles?.includes('trainer') && u.status === 'active');
        setTrainers(onlyTrainers);
        setSelectedTrainerId((current) => current || onlyTrainers[0]?._id || '');
      })
      .catch(() => setTrainers([]));
  }, []);

  useEffect(() => {
    if (!range) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    getAllAttendance(token, range.start, range.end)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [range]);

  // Igual que en Calendario: se mide cuánto ocupa lo que hay por encima
  // (aquí, solo el selector de entrenador) para que la tarjeta entera
  // llegue justo hasta el borde de la pantalla, sin desplazar la página.
  useEffect(() => {
    function recalcOffset() {
      const el = cardRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 24;
      setTopOffset(top + BOTTOM_GAP);
    }
    recalcOffset();
    window.addEventListener('resize', recalcOffset);
    return () => window.removeEventListener('resize', recalcOffset);
  }, [trainers.length]);

  // Swipe táctil para cambiar de semana, igual que en Calendario: en
  // móvil los botones prev/next se ocultan por CSS (ver
  // fullcalendar-theme.css), así que sin esto no habría forma de moverse.
  useEffect(() => {
    const el = calendarWrapperRef.current;
    if (!el) return;

    const DIRECTION_THRESHOLD = 10;
    const DECIDE_TIME_LIMIT = 180;
    const SWIPE_THRESHOLD = 60;

    let start: { x: number; y: number; time: number } | null = null;
    let decided: 'horizontal' | 'vertical' | 'abandoned' | null = null;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
      decided = null;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!start || decided === 'abandoned') return;
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (!decided) {
        if (Date.now() - start.time > DECIDE_TIME_LIMIT) {
          decided = 'abandoned';
          return;
        }
        if (Math.abs(dx) < DIRECTION_THRESHOLD && Math.abs(dy) < DIRECTION_THRESHOLD) return;
        decided = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'horizontal' : 'vertical';
      }

      if (decided === 'horizontal') {
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const wasHorizontal = decided === 'horizontal';
      const startPoint = start;
      start = null;
      decided = null;
      if (!wasHorizontal || !startPoint) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startPoint.x;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      const api = calendarRef.current?.getApi();
      if (!api) return;
      const direction = dx < 0 ? 1 : -1;
      prepareDaySlide(direction);
      if (direction > 0) api.next();
      else api.prev();
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [trainers.length]);

  function handleDatesSet(arg: any) {
    setRange({ start: arg.startStr, end: arg.endStr });
    loadHolidaysForYear(arg.start.getFullYear());
    if (arg.end.getFullYear() !== arg.start.getFullYear()) {
      loadHolidaysForYear(arg.end.getFullYear());
    }

    // Si el cambio de semana viene de un swipe, FullCalendar ya ha
    // terminado de pintar la semana nueva en este punto: es el momento
    // exacto de deslizar la copia congelada de la vieja hacia fuera y la
    // nueva hacia dentro.
    const direction = pendingSlideDirectionRef.current;
    pendingSlideDirectionRef.current = null;
    const clone = slideCloneRef.current;
    slideCloneRef.current = null;
    if (!direction || !clone) return;

    const container = calendarWrapperRef.current;
    const harness = container?.querySelector('.fc-view-harness') as HTMLElement | null;
    if (!container || !harness) {
      clone.remove();
      return;
    }

    harness.style.transition = 'none';
    harness.style.transform = `translateX(${direction > 0 ? '100%' : '-100%'})`;
    void harness.offsetWidth; // fuerza reflow antes de animar
    requestAnimationFrame(() => {
      harness.style.transition = 'transform 260ms ease-out';
      harness.style.transform = 'translateX(0)';
      clone.style.transition = 'transform 260ms ease-out';
      clone.style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
    });
    setTimeout(() => {
      clone.remove();
      harness.style.transition = '';
      harness.style.transform = '';
    }, 300);
  }

  // Deja preparada una copia congelada de la vista actual (para deslizarla
  // fuera) y marca la dirección; la animación de verdad se dispara en
  // handleDatesSet, una vez FullCalendar ya ha pintado la semana nueva.
  function prepareDaySlide(direction: 1 | -1): boolean {
    const container = calendarWrapperRef.current;
    const harness = container?.querySelector('.fc-view-harness') as HTMLElement | null;
    if (!container || !harness) return false;

    // Importante: el clon tiene que quedar DENTRO de .fc (como hermano del
    // .fc-view-harness real), no fuera. El CSS de FullCalendar usa
    // selectores tipo ".fc .fc-timegrid-event-harness" que exigen un
    // ancestro con clase "fc" — fuera de ahí pierde esas reglas y el
    // navegador calcula mal la altura de los eventos (se ven enormes).
    const fcRoot = harness.parentElement;
    if (!fcRoot) return false;

    const rect = harness.getBoundingClientRect();
    const clone = harness.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = `${harness.offsetTop}px`;
    clone.style.left = `${harness.offsetLeft}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '20';
    clone.style.pointerEvents = 'none';
    clone.style.overflow = 'hidden';
    clone.style.background = 'white';
    // cloneNode no copia el scroll interno: si el usuario había bajado a
    // ver horas más tardías, lo replicamos para que la copia coincida.
    clone.scrollTop = harness.scrollTop;

    fcRoot.appendChild(clone);
    slideCloneRef.current = clone;
    pendingSlideDirectionRef.current = direction;
    return true;
  }

  const selectedTrainer = trainers.find((t) => t._id === selectedTrainerId);
  const color = selectedTrainer?.color || DEFAULT_TRAINER_COLOR;

  const events = entries
    .filter((e) => (e.trainer?._id || e.trainer) === selectedTrainerId)
    .map((e) => ({
      id: e._id,
      start: e.clockIn,
      end: e.clockOut || new Date().toISOString(),
      color: hexToRgba(color, 0.35),
      borderColor: color,
      textColor: '#2b2b2a',
      extendedProps: { manual: !!e.manual },
    }));

  return (
    <div
      ref={cardRef}
      className="flex flex-col rounded-xl bg-white p-4"
      style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
    >
      <div className="mb-3 shrink-0">
        <TrainerDropdown trainers={trainers} value={selectedTrainerId} onChange={setSelectedTrainerId} />
      </div>

      {trainers.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">No hay entrenadores activos.</p>
      ) : (
        <div
          ref={calendarWrapperRef}
          className="ziti-week-view relative min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin]}
            initialView="timeGridWeek"
            firstDay={1}
            weekends
            headerToolbar={{ left: 'prev,next today', center: '', right: '' }}
            buttonText={{ today: 'Esta semana' }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            dayCellClassNames={(arg) =>
              holidaysByDate[dayKey(arg.date)] ? ['ziti-day-holiday'] : []
            }
            dayHeaderContent={(arg) => {
              const holidayName = holidaysByDate[dayKey(arg.date)];
              return (
                <div className="flex flex-col items-center">
                  <span>{arg.text}</span>
                  {holidayName && (
                    <span className="ziti-holiday-label" title={holidayName}>
                      Festivo
                    </span>
                  )}
                </div>
              );
            }}
            locale="es"
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            expandRows
            selectable={false}
            editable={false}
            eventStartEditable={false}
            slotDuration="00:30:00"
            displayEventTime={false}
            eventContent={renderEventContent}
            events={events}
            datesSet={handleDatesSet}
          />
        </div>
      )}
    </div>
  );
}
