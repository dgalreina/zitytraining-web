'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import '@/styles/fullcalendar-theme.css';
import { ChevronDown, Check } from 'lucide-react';
import { getUsers, getAllAttendance } from '@/lib/api';
import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return `rgba(134, 133, 133, ${alpha})`;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      if (dx < 0) api.next();
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
            weekends={false}
            headerToolbar={{ left: 'prev,next today', center: '', right: '' }}
            buttonText={{ today: 'Esta semana' }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
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
            displayEventTime
            events={events}
            datesSet={handleDatesSet}
          />
        </div>
      )}
    </div>
  );
}
