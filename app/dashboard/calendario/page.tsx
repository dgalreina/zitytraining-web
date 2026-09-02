'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';
import '@/styles/fullcalendar-theme.css';
import { X, Trash2, ChevronDown, Check, Filter } from 'lucide-react';
import MiniCalendar, { dayKey } from '@/components/MiniCalendar';
import {
  getUsers,
  getMe,
  getActiveClients,
  getBookings,
  getBookingsByTrainers,
  createBooking,
  updateBooking,
  deleteBooking,
} from '@/lib/api';

registerLocale('es', es);

const FALLBACK_COLOR = '#868585';
const ALL_VALUE = 'all';

type ModalState =
  | { mode: 'create'; start: Date }
  | { mode: 'edit'; booking: any; start: Date }
  | null;

type DurationOption = '40' | '60' | 'custom';
function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Desplegable genérico reutilizable para ambos filtros (entrenador / cliente)
function FilterDropdown({
  label,
  options,
  value,
  onChange,
  showColorDot,
}: {
  label: string;
  options: { id: string; name: string; color?: string }[];
  value: string;
  onChange: (id: string) => void;
  showColorDot?: boolean;
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

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative w-full sm:w-56">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#2b2b2a]"
      >
        <span className="flex items-center gap-2 truncate">
          {showColorDot && selected && selected.id !== ALL_VALUE && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color || FALLBACK_COLOR }}
            />
          )}
          <span className="truncate">{selected ? selected.name : label}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                o.id === value
                  ? 'bg-[#a2c037]/10 font-semibold text-[#4b7a1f]'
                  : 'text-[#2b2b2a] hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {showColorDot && o.id !== ALL_VALUE && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color || FALLBACK_COLOR }}
                  />
                )}
                <span className="truncate">{o.name}</span>
              </span>
              {o.id === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Checklist de entrenadores: de ninguno a todos, no una sola opción
function TrainerMultiSelect({
  trainers,
  selectedIds,
  onChange,
}: {
  trainers: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
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

  const allSelected = trainers.length > 0 && selectedIds.length === trainers.length;
  const noneSelected = selectedIds.length === 0;

  function toggleOne(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id],
    );
  }

  let summary = 'Ningún entrenador';
  if (allSelected) summary = 'Todos los entrenadores';
  else if (!noneSelected) {
    const names = trainers
      .filter((t) => selectedIds.includes(t._id))
      .map((t) => t.firstName);
    summary = names.length <= 2 ? names.join(', ') : `${names.length} entrenadores`;
  }

  return (
    <div ref={ref} className="relative w-full sm:w-56">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#2b2b2a]"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1.5 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <div className="flex gap-1 border-b border-gray-100 px-2 py-1.5">
            <button
              type="button"
              onClick={() => onChange(trainers.map((t) => t._id))}
              className="text-xs font-semibold text-[#4b7a1f] hover:underline"
            >
              Todos
            </button>
            <span className="text-xs text-gray-300">·</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-[#868585] hover:underline"
            >
              Ninguno
            </button>
          </div>
          {trainers.map((t) => {
            const isChecked = selectedIds.includes(t._id);
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => toggleOne(t._id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#2b2b2a] hover:bg-gray-50"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-400 bg-white">
                  {isChecked && <Check size={12} className="text-[#2b2b2a]" strokeWidth={3} />}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color || FALLBACK_COLOR }}
                />
                {t.firstName} {t.lastName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CalendarioPage() {
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [ownColor, setOwnColor] = useState(FALLBACK_COLOR);
  const [roleReady, setRoleReady] = useState(false);

  const [trainers, setTrainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(ALL_VALUE);
  const [loadingLists, setLoadingLists] = useState(false);

  const isClientMode = selectedClientId !== ALL_VALUE;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [modalTrainerId, setModalTrainerId] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>('60');
  const [customMinutes, setCustomMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewTitle, setViewTitle] = useState('');
  const [viewType, setViewType] = useState('timeGridWeek');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const gridRowRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ eventId: string; start: Date; end: Date } | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeTriggeredRef = useRef(false);
  const router = useRouter();

  const isTrainerPerspective = isAdmin || isTrainer;

  // Se puede crear/editar/borrar mientras no estemos viendo el calendario
  // por cliente (ahí se mantiene solo lectura). El modal siempre pregunta
  // a qué entrenador pertenece cada sesión nueva, así que no hace falta
  // tener exactamente uno marcado en el checklist para poder crear.
  const canEdit = !isClientMode && isTrainerPerspective;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    const { id, roles } = JSON.parse(storedUser);
    setUserId(id);

    const admin = roles?.includes('admin') ?? false;
    const trainer = roles?.includes('trainer') ?? false;
    setIsAdmin(admin);
    setIsTrainer(trainer);

    if (trainer) {
      getMe(token)
        .then((me) => setOwnColor(me.color || FALLBACK_COLOR))
        .catch(() => {});
    }

    if (admin || trainer) {
      setLoadingLists(true);
      Promise.all([getUsers(token), getActiveClients(token)])
        .then(([users, activeClients]) => {
          const activeTrainers = users.filter(
            (u: any) => u.roles?.includes('trainer') && u.status === 'active',
          );
          setTrainers(activeTrainers);
          // Por defecto, todos los entrenadores marcados
          setSelectedTrainerIds(activeTrainers.map((t: any) => t._id));
          const sortedClients = [...activeClients].sort((a: any, b: any) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es'),
          );
          setClients(sortedClients);
        })
        .finally(() => setLoadingLists(false));
    }

    setRoleReady(true);
  }, [router]);

  function bookingToEvent(b: any) {
    // De más a menos detallado: se usa el primero que quepa entero (partido
    // en líneas si hace falta); si ninguno cabe, se muestra el más corto
    // aunque se corte, pero el nombre nunca desaparece.
    let candidates: string[] = [];
    let color = FALLBACK_COLOR;

    if (isClientMode) {
      // Un cliente puede tener varios entrenadores: mostramos quién es
      // el entrenador de cada sesión, con su color.
      const full = b.trainer ? `${b.trainer.firstName} ${b.trainer.lastName}` : 'Entrenador';
      const short = b.trainer?.firstName || 'Entrenador';
      candidates = [full, short];
      color = b.trainer?.color || FALLBACK_COLOR;
    } else {
      // Nombres de clientes, color del entrenador de esa sesión concreta
      // (funciona igual con 1, varios, o todos los entrenadores marcados)
      const clients = b.clients || [];
      const full = clients.map((c: any) => `${c.firstName} ${c.lastName}`).join(', ');
      const initials = clients
        .map((c: any) => `${c.firstName} ${c.lastName?.[0] ?? ''}.`)
        .join(', ');
      const short = clients.map((c: any) => c.firstName).join(', ');
      candidates = [full, initials, short];
      color = b.trainer?.color || FALLBACK_COLOR;
    }

    candidates = candidates.filter(Boolean);
    if (candidates.length === 0) candidates = ['Sesión'];

    return {
      id: b._id,
      title: candidates[0],
      start: b.startTime,
      end: b.endTime,
      color,
      extendedProps: { raw: b, candidates },
    };
  }

  // Recorta el contenido de un evento del calendario según el espacio real
  // disponible: nombre completo -> solo nombre, dejando que el texto se
  // parta en varias líneas si hace falta (nunca desaparece del todo, como
  // mucho se corta a medias si de verdad no cabe ni en alto); hora -> se
  // oculta si no cabe.
  function fitEventText(el: HTMLElement, event: any) {
    const boxEl = el.querySelector('.ziti-event-box') as HTMLElement | null;
    const nameEl = el.querySelector('.ziti-event-name') as HTMLElement | null;
    const timeEl = el.querySelector('.ziti-event-time') as HTMLElement | null;
    if (!boxEl || !nameEl) return;

    const candidates: string[] = event.extendedProps?.candidates?.length
      ? event.extendedProps.candidates
      : [event.title];

    // El propio texto nunca desborda de sí mismo (crece a su contenido), así
    // que hay que medir el desbordamiento contra la caja real (que sí tiene
    // alto fijo y overflow:hidden), no contra el texto.
    function tryFitName(): boolean {
      for (const candidate of candidates) {
        nameEl!.textContent = candidate;
        if (boxEl!.scrollHeight <= boxEl!.clientHeight) return true;
      }
      return false;
    }

    // Hora: si no cabe de ancho, se quita directamente.
    if (timeEl) {
      timeEl.style.display = '';
      if (timeEl.scrollWidth > timeEl.clientWidth) {
        timeEl.style.display = 'none';
      }
    }

    let fits = tryFitName();

    // Si ni el nombre más corto cabe con la hora todavía visible, la
    // quitamos: el nombre importa más y necesita todo el alto disponible.
    if (!fits && timeEl && timeEl.style.display !== 'none') {
      timeEl.style.display = 'none';
      fits = tryFitName();
    }

    // Aun así no cabe entero (caja diminuta): nos quedamos con el más corto,
    // aunque se corte, para que el nombre nunca desaparezca del todo.
    if (!fits) {
      nameEl.textContent = candidates[candidates.length - 1];
    }
  }

  function handleEventDidMount(info: any) {
    fitEventText(info.el, info.event);
    const ro = new ResizeObserver(() => fitEventText(info.el, info.event));
    ro.observe(info.el);
    (info.el as any).__zitiResizeObserver = ro;
  }

  function handleEventWillUnmount(info: any) {
    (info.el as any).__zitiResizeObserver?.disconnect();
  }

  async function loadBookings(fromStr: string, toStr: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      let data: any[] = [];
      if (isClientMode) {
        data = await getBookings(token, { client: selectedClientId, from: fromStr, to: toStr });
      } else if (selectedTrainerIds.length > 0) {
        data = await getBookingsByTrainers(token, selectedTrainerIds, fromStr, toStr);
      }
      setEvents(data.map(bookingToEvent));
    } catch {
      // silencioso
    }
  }

  async function loadMonthDots(monthDate: Date) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    try {
      let data: any[] = [];
      if (isClientMode) {
        data = await getBookings(token, {
          client: selectedClientId,
          from: start.toISOString(),
          to: end.toISOString(),
        });
      } else if (selectedTrainerIds.length > 0) {
        data = await getBookingsByTrainers(
          token,
          selectedTrainerIds,
          start.toISOString(),
          end.toISOString(),
        );
      }
      const keys = new Set<string>(data.map((b: any) => dayKey(new Date(b.startTime))));
      setDaysWithBookings(keys);
    } catch {
      // silencioso
    }
  }

  function handleDatesSet(info: any) {
    loadBookings(info.startStr, info.endStr);
    setSelectedDate(info.view.currentStart);
    setViewTitle(info.view.title);
    setViewType(info.view.type);
  }

  useEffect(() => {
    if (roleReady && calendarRef.current) {
      const api = calendarRef.current.getApi();
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      loadMonthDots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleReady, selectedTrainerIds, selectedClientId]);

  // Alto del calendario calculado en tiempo real (en vez de un número mágico
  // fijo tipo "100dvh - 190px") para que no dependa de cuánto ocupe lo que
  // haya encima (saludo, filtros, etc.), que puede cambiar con el tiempo.
  useEffect(() => {
    function recalcHeight() {
      const el = gridRowRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 16; // un poco de aire debajo de la última franja
      setGridHeight(Math.max(window.innerHeight - top - BOTTOM_GAP, 300));
    }
    recalcHeight();
    window.addEventListener('resize', recalcHeight);
    return () => window.removeEventListener('resize', recalcHeight);
  }, [roleReady]);

  function handleMiniDateChange(date: Date | null) {
    if (!date) return;
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  }

  function handleMiniMonthChange(date: Date) {
    loadMonthDots(date);
  }

  function openCreateModal(start: Date) {
    if (!canEdit) return;
    setModal({ mode: 'create', start });
    setSelectedClientIds([]);
    setClientSearch('');
    setNotes('');
    setDurationOption('60');
    setCustomMinutes(60);
    setError('');

    // Preseleccionamos tu propio usuario si eres entrenador, o el primero
    // marcado en el checklist si eres admin puro; el selector del modal
    // siempre se muestra, así que esto es solo un punto de partida cómodo.
    if (isTrainer) {
      setModalTrainerId(userId);
    } else {
      setModalTrainerId(selectedTrainerIds[0] || trainers[0]?._id || '');
    }
  }

  function openEditModal(raw: any) {
    if (!canEdit) return;
    const start = new Date(raw.startTime);
    const end = new Date(raw.endTime);
    const diff = minutesBetween(start, end);

    setModal({ mode: 'edit', booking: raw, start });
    setModalTrainerId(raw.trainer?._id || raw.trainer || '');
    setSelectedClientIds(raw.clients.map((c: any) => c._id));
    setClientSearch('');
    setNotes(raw.notes || '');

    if (diff === 40) {
      setDurationOption('40');
    } else if (diff === 60) {
      setDurationOption('60');
    } else {
      setDurationOption('custom');
      setCustomMinutes(diff);
    }
    setError('');
  }

  function handleSelect(selectInfo: any) {
    openCreateModal(selectInfo.start);
    selectInfo.view.calendar.unselect();
  }

  function handleEventClick(clickInfo: any) {
    openEditModal(clickInfo.event.extendedProps.raw);
  }

  async function handleEventDrop(info: any) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateBooking(token, info.event.id, {
        startTime: info.event.start.toISOString(),
        endTime: info.event.end.toISOString(),
      });
      loadMonthDots(selectedDate);
    } catch (err: any) {
      alert(err.message || 'No se pudo mover la sesión');
      info.revert();
    }
  }

  function clearEdgeTimer() {
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
  }

  async function advanceDraggedEventToNextDay() {
    edgeTriggeredRef.current = true;
    clearEdgeTimer();

    const drag = dragStateRef.current;
    const api = calendarRef.current?.getApi();
    if (!drag || !api) return;

    const newStart = new Date(drag.start);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(drag.end);
    newEnd.setDate(newEnd.getDate() + 1);

    // Avanza el calendario visualmente al día siguiente
    api.next();
    // Usamos la fecha real del calendario (no el estado "selectedDate",
    // que aquí estaría congelado del primer render) por si el avance
    // cruza también a un mes distinto.
    const currentApiDate = api.getDate();

    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateBooking(token, drag.eventId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      loadMonthDots(currentApiDate);
    } catch (err: any) {
      alert(err.message || 'No se pudo mover la sesión al día siguiente');
    }
  }

  function handleDragPointerMoveLogic(e: PointerEvent) {
    if (viewType !== 'timeGridDay') return;
    if (!dragStateRef.current || edgeTriggeredRef.current) return;

    const wrapper = calendarWrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const EDGE_PX = 36;
    const nearRightEdge = e.clientX > rect.right - EDGE_PX && e.clientX <= rect.right + 15;

    if (nearRightEdge) {
      // Mantén el cursor ~600ms cerca del borde antes de avanzar, para que
      // un simple roce al pasar por ahí no dispare el cambio de día sin querer.
      if (!edgeTimerRef.current) {
        edgeTimerRef.current = setTimeout(() => {
          advanceDraggedEventToNextDay();
        }, 600);
      }
    } else {
      clearEdgeTimer();
    }
  }

  // Patrón "última versión siempre fresca": guardamos la lógica de arriba
  // (que sí depende de estado/props actuales) en una ref que se actualiza
  // en cada render. El listener que de verdad se engancha a window es un
  // envoltorio con identidad ESTABLE para siempre, que simplemente delega
  // a lo que haya en la ref en ese momento — así addEventListener y
  // removeEventListener siempre coinciden, y la lógica nunca queda obsoleta.
  const latestPointerMoveRef = useRef(handleDragPointerMoveLogic);
  useEffect(() => {
    latestPointerMoveRef.current = handleDragPointerMoveLogic;
  });
  const stablePointerMoveHandler = useRef((e: PointerEvent) => {
    latestPointerMoveRef.current(e);
  }).current;

  function handleEventDragStart(info: any) {
    dragStateRef.current = {
      eventId: info.event.id,
      start: info.event.start,
      end: info.event.end,
    };
    edgeTriggeredRef.current = false;
    window.addEventListener('pointermove', stablePointerMoveHandler);
  }

  function handleEventDragStop() {
    window.removeEventListener('pointermove', stablePointerMoveHandler);
    clearEdgeTimer();
    dragStateRef.current = null;
  }

  function toggleClient(id: string) {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function getEffectiveDurationMinutes() {
    if (durationOption === '40') return 40;
    if (durationOption === '60') return 60;
    return customMinutes;
  }

  function handleStartTimeChange(date: Date | null) {
    if (!modal || !date) return;
    setModal({ ...modal, start: date } as ModalState);
  }

  async function handleSaveModal() {
    if (!modal) return;

    if (!modalTrainerId) {
      setError('Selecciona un entrenador');
      return;
    }

    if (selectedClientIds.length === 0) {
      setError('Selecciona al menos un cliente');
      return;
    }

    const duration = getEffectiveDurationMinutes();
    if (!duration || duration < 5) {
      setError('La duración debe ser de al menos 5 minutos');
      return;
    }

    const start = modal.start;
    const end = new Date(start.getTime() + duration * 60000);

    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (modal.mode === 'create') {
        await createBooking(token, {
          trainer: modalTrainerId,
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      } else {
        await updateBooking(token, modal.booking._id, {
          trainer: modalTrainerId,
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      }
      setModal(null);
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModal() {
    if (modal?.mode !== 'edit') return;
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await deleteBooking(token, modal.booking._id);
      setModal(null);
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la sesión');
    } finally {
      setSaving(false);
    }
  }

  if (!roleReady || loadingLists) {
    return <p className="text-sm text-gray-400">Cargando...</p>;
  }

  const clientOptions = [
    { id: ALL_VALUE, name: 'Todos los clientes' },
    ...clients.map((c) => ({ id: c._id, name: `${c.firstName} ${c.lastName}` })),
  ];

  return (
    <div>
      {(isAdmin || isTrainer) && (
        <>
          {/* Escritorio: filtros siempre visibles */}
          <div className="mb-4 hidden flex-wrap gap-3 sm:flex">
            <TrainerMultiSelect
              trainers={trainers}
              selectedIds={selectedTrainerIds}
              onChange={setSelectedTrainerIds}
            />
            <FilterDropdown
              label="Cliente"
              options={clientOptions}
              value={selectedClientId}
              onChange={setSelectedClientId}
            />
          </div>

          {/* Móvil: botón compacto que abre los filtros en una hoja */}
          <div className="mb-4 flex justify-end sm:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#2b2b2a]"
            >
              <Filter size={15} />
              Filtros
            </button>
          </div>

          {filtersOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:hidden"
              onClick={() => setFiltersOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                    Filtros
                  </h3>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <TrainerMultiSelect
                    trainers={trainers}
                    selectedIds={selectedTrainerIds}
                    onChange={setSelectedTrainerIds}
                  />
                  <FilterDropdown
                    label="Cliente"
                    options={clientOptions}
                    value={selectedClientId}
                    onChange={setSelectedClientId}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div
        ref={gridRowRef}
        className="flex h-[calc(100dvh-190px)] gap-5"
        style={gridHeight !== null ? { height: gridHeight } : undefined}
      >
        <div className="hidden w-64 shrink-0 self-start overflow-y-auto rounded-xl bg-white p-4 md:block">
          <MiniCalendar
            selected={selectedDate}
            onChange={handleMiniDateChange}
            onMonthChange={handleMiniMonthChange}
            daysWithBookings={daysWithBookings}
            highlightWeek={viewType === 'timeGridWeek'}
          />
        </div>

        <div
          ref={calendarWrapperRef}
          className={`min-w-0 flex-1 overflow-hidden rounded-xl bg-white p-4 ${
            viewType === 'timeGridWeek' ? 'ziti-week-view' : ''
          }`}
        >
          <p className="ziti-calendar-title mb-2 text-center font-[family-name:var(--font-work-sans)] text-sm font-bold capitalize text-[#2b2b2a] sm:text-left">
            {viewTitle}
          </p>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            firstDay={1}
            weekends={false}
            headerToolbar={{ left: 'prev,next today', center: '', right: 'timeGridDay,timeGridWeek' }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            buttonText={{ today: 'Hoy', day: 'Día', week: 'Semana' }}
            locale="es"
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            selectable={canEdit}
            selectLongPressDelay={200}
            eventStartEditable={canEdit}
            eventDurationEditable={false}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
            eventDidMount={handleEventDidMount}
            eventWillUnmount={handleEventWillUnmount}
            datesSet={handleDatesSet}
            events={events}
            eventColor={FALLBACK_COLOR}
            slotEventOverlap={false}
            slotDuration="00:30:00"
            snapDuration="00:05:00"
            displayEventTime={false}
            eventContent={(arg) => {
              const raw = arg.event.extendedProps.raw;
              const start = arg.event.start;
              const end = arg.event.end;
              const timeStr =
                start && end
                  ? `${start.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}–${end.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : '';
              return (
                <div className="ziti-event-box">
                  <div className="ziti-event-time">{timeStr}</div>
                  <div className="ziti-event-name">{arg.event.title}</div>
                  {raw?.notes && <div className="ziti-event-tooltip">{raw.notes}</div>}
                </div>
              );
            }}
          />
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {modal.mode === 'create' ? 'Nueva sesión' : 'Editar sesión'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-[#868585]">
                Entrenador
              </label>
              <FilterDropdown
                label="Elige un entrenador"
                options={trainers.map((t) => ({
                  id: t._id,
                  name: `${t.firstName} ${t.lastName}`,
                  color: t.color,
                }))}
                value={modalTrainerId}
                onChange={setModalTrainerId}
                showColorDot
              />
            </div>

            <label className="mb-1 block text-xs font-semibold text-[#868585]">
              Hora de inicio
            </label>
            <DatePicker
              selected={modal.start}
              onChange={handleStartTimeChange}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={5}
              timeCaption="Hora"
              dateFormat="HH:mm"
              locale="es"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
              wrapperClassName="mb-3 w-full block"
            />
            <p className="mb-3 text-xs text-[#868585]">
              {modal.start.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>

            <label className="mb-1.5 block text-xs font-semibold text-[#868585]">Duración</label>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setDurationOption('40')}
                className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
                  durationOption === '40'
                    ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                    : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                }`}
              >
                40 min
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('60')}
                className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
                  durationOption === '60'
                    ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                    : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                }`}
              >
                1 hora
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('custom')}
                className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
                  durationOption === 'custom'
                    ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                    : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                }`}
              >
                Otra
              </button>
            </div>

            {durationOption === 'custom' && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[#868585]">
                  Minutos
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
                />
              </div>
            )}

            <p className="mb-3 text-xs text-[#868585]">
              Termina a las{' '}
              {new Date(modal.start.getTime() + getEffectiveDurationMinutes() * 60000).toLocaleTimeString(
                'es-ES',
                { hour: '2-digit', minute: '2-digit' },
              )}
            </p>

            <label className="mb-1 block text-xs font-semibold text-[#868585]">Clientes</label>
            {clients.length > 0 && (
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="mb-1.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6aa842] focus:outline-none"
              />
            )}
            <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-1">
              {(() => {
                const filteredClients = clients.filter((c) =>
                  `${c.firstName} ${c.lastName}`
                    .toLowerCase()
                    .includes(clientSearch.trim().toLowerCase()),
                );
                if (clients.length === 0) {
                  return <p className="p-2 text-xs text-gray-400">No hay clientes activos.</p>;
                }
                if (filteredClients.length === 0) {
                  return <p className="p-2 text-xs text-gray-400">Sin resultados.</p>;
                }
                return (
                  <div className="grid grid-cols-2 gap-x-1">
                    {filteredClients.map((c) => (
                      <label
                        key={c._id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(c._id)}
                          onChange={() => toggleClient(c._id)}
                          className="shrink-0 accent-[#6aa842]"
                        />
                        <span className="truncate">
                          {c.firstName} {c.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>

            <label className="mb-1 block text-xs font-semibold text-[#868585]">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
            />

            {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveModal}
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  onClick={handleDeleteModal}
                  disabled={saving}
                  title="Eliminar sesión"
                  className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}