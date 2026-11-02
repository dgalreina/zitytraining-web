'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import '@/styles/fullcalendar-theme.css';
import { ChevronDown, Check } from 'lucide-react';
import { getUsers } from '@/lib/usersApi';
import { getAllAttendance, getMyAttendance } from '@/lib/attendanceApi';
import { getHolidays } from '@/lib/holidaysApi';
import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';
import { dayKey } from '@/components/MiniCalendar';
import ColorDot from '@/components/ColorDot';
import { sumHoursWorked, formatHoursWorked } from '@/lib/attendanceHours';
import { useCalendarDaySlide } from '../calendario/useCalendarDaySlide';
import { useSwipeNavigation } from '../calendario/useSwipeNavigation';

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

export default function WeeklyAttendanceCalendar({
  lockedTrainerId,
}: {
  // Con esto puesto, es el propio entrenador mirando lo suyo: sin
  // desplegable (no puede elegir a otro), y con el total de horas de
  // este mes. Sin esto, es el admin, que puede elegir a cualquiera (como
  // hasta ahora).
  lockedTrainerId?: string;
}) {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(lockedTrainerId || '');
  const [entries, setEntries] = useState<any[]>([]);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [monthHours, setMonthHours] = useState<number | null>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<FullCalendar>(null);
  // Igual que en Calendario: deslizamiento congelado de la semana vieja
  // hacia fuera y la nueva hacia dentro al cambiar de semana.
  const { prepareDaySlide, runPendingSlideAnimation } = useCalendarDaySlide(calendarWrapperRef);
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
    // GET /attendance (todos los entrenadores) es solo para admin: un
    // entrenador mirando lo suyo pide /attendance/me, que el backend ya
    // acota a él mismo.
    const fetchEntries = lockedTrainerId
      ? getMyAttendance(token, range.start, range.end)
      : getAllAttendance(token, range.start, range.end);
    fetchEntries.then(setEntries).catch(() => setEntries([]));
  }, [range, lockedTrainerId]);

  // Horas de este mes (no de la semana que se esté viendo): se pide una
  // vez, con el mes de hoy, independiente de a qué semana navegue el
  // calendario de abajo. Un fichaje sin salida todavía cuenta hasta
  // ahora mismo (ver sumHoursWorked).
  useEffect(() => {
    if (!lockedTrainerId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    getMyAttendance(token, monthStart.toISOString(), monthEnd.toISOString())
      .then((data) => setMonthHours(sumHoursWorked(data)))
      .catch(() => setMonthHours(null));
  }, [lockedTrainerId]);

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
  useSwipeNavigation({
    calendarWrapperRef,
    calendarRef,
    viewType: 'timeGridWeek',
    prepareDaySlide,
    ready: trainers.length > 0,
  });

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
    runPendingSlideAnimation();
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
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        {lockedTrainerId ? (
          <p className="text-sm text-gray-600">
            Horas este mes:{' '}
            <span className="font-semibold text-gray-900">
              {monthHours !== null ? formatHoursWorked(monthHours) : '...'}
            </span>
          </p>
        ) : (
          <TrainerDropdown trainers={trainers} value={selectedTrainerId} onChange={setSelectedTrainerId} />
        )}
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
