'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@/styles/fullcalendar-theme.css';
import { X, ChevronDown, Check } from 'lucide-react';
import MiniCalendar, { dayKey } from '@/components/MiniCalendar';
import FilterDropdown from '@/components/FilterDropdown';
import BookingModal, { ModalState } from './BookingModal';
import { getUsers, getMe, getActiveClients, getBookings, getBookingsByTrainers, updateBooking } from '@/lib/api';

const FALLBACK_COLOR = '#868585';
const PRIVATE_COLOR = '#fa8072';
const ALL_VALUE = 'all';

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
  const [viewTitle, setViewTitle] = useState('');
  const [viewType, setViewType] = useState('timeGridWeek');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const pendingSlideDirectionRef = useRef<1 | -1 | null>(null);
  const slideCloneRef = useRef<HTMLElement | null>(null);
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
          // Admin: todos los entrenadores marcados por defecto. Entrenador:
          // solo él mismo.
          setSelectedTrainerIds(admin ? activeTrainers.map((t: any) => t._id) : [id]);
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

    if (b.isPrivate) {
      // Sesión personal del entrenador: no lleva clientes, siempre en
      // salmón (independiente del color que tenga asignado el entrenador),
      // para que se distinga a simple vista de una sesión normal.
      candidates = ['Privada'];
      color = PRIVATE_COLOR;
    } else if (isClientMode) {
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

    // Si el cambio de fecha viene de un swipe, FullCalendar ya ha terminado
    // de pintar el día nuevo en este punto: es el momento exacto de deslizar
    // la copia congelada del día viejo hacia fuera y el día nuevo hacia dentro.
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
  // handleDatesSet, una vez FullCalendar ya ha pintado el día nuevo. La usan
  // tanto el swipe como el arrastre de un evento al borde. Devuelve si pudo
  // prepararla (si no, el cambio de día sigue funcionando, solo sin animar).
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

  function startDaySlide(direction: 1 | -1) {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    prepareDaySlide(direction);
    if (direction > 0) api.next();
    else api.prev();
  }

  useEffect(() => {
    if (roleReady && calendarRef.current) {
      const api = calendarRef.current.getApi();
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      loadMonthDots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleReady, selectedTrainerIds, selectedClientId]);

  // El alto disponible se sigue calculando con 100dvh (fiable en móvil: sí
  // tiene en cuenta la barra de direcciones dinámica, a diferencia de
  // window.innerHeight). Lo único que medimos en JS es cuánto ocupa lo que
  // hay encima del calendario, en vez de un número mágico fijo tipo "190px"
  // que se desincroniza en cuanto cambia algo arriba (saludo, filtros...).
  //
  // Ojo: mientras loadingLists es true se muestra "Cargando..." en vez del
  // calendario (ver el guard más abajo), así que gridRowRef.current todavía
  // no existe cuando roleReady se pone a true (se pone antes de que
  // termine la carga). Sin loadingLists aquí, este efecto se quedaba
  // midiendo "null" para siempre y el alto se quedaba pegado al 190px de
  // repuesto, dejando un hueco vacío cuando el contenido real ya ocupaba
  // menos que eso.
  useEffect(() => {
    function recalcOffset() {
      const el = gridRowRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 32; // aire debajo de la última franja, para que no roce el borde
      setTopOffset(top + BOTTOM_GAP);
    }
    recalcOffset();
    window.addEventListener('resize', recalcOffset);
    return () => window.removeEventListener('resize', recalcOffset);
  }, [roleReady, loadingLists]);

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
  }

  function openEditModal(raw: any) {
    if (!canEdit) return;
    setModal({ mode: 'edit', booking: raw, start: new Date(raw.startTime) });
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
      // Sin esto, el "raw" que lleva colgado el evento (con la hora vieja)
      // se queda tal cual, y si reabres el modal para editar te sale la
      // hora/día de antes de arrastrar, aunque el evento ya se vea movido.
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
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

  // direction: 1 = siguiente (borde derecho), -1 = anterior (borde izquierdo).
  // En vista "Semana" se desplaza 7 días (una semana entera) en vez de 1,
  // para caer en el mismo día de la semana siguiente/anterior.
  async function advanceDraggedEventByDays(direction: 1 | -1) {
    edgeTriggeredRef.current = true;
    clearEdgeTimer();

    const drag = dragStateRef.current;
    const api = calendarRef.current?.getApi();
    if (!drag || !api) return;

    const daysShift = viewType === 'timeGridWeek' ? 7 : 1;
    const newStart = new Date(drag.start);
    newStart.setDate(newStart.getDate() + direction * daysShift);
    const newEnd = new Date(drag.end);
    newEnd.setDate(newEnd.getDate() + direction * daysShift);

    // Avanza/retrocede el calendario visualmente, con el mismo deslizamiento
    // que usa el swipe.
    prepareDaySlide(direction);
    if (direction > 0) api.next();
    else api.prev();
    // Usamos la fecha real del calendario (no el estado "selectedDate",
    // que aquí estaría congelado del primer render) por si el cambio
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
      const dirLabel = direction > 0 ? 'siguiente' : 'anterior';
      const fallback =
        viewType === 'timeGridWeek'
          ? `No se pudo mover la sesión a la semana ${dirLabel}`
          : `No se pudo mover la sesión al día ${dirLabel}`;
      alert(err.message || fallback);
    }
  }

  function handleDragPointerMoveLogic(e: PointerEvent) {
    if (viewType !== 'timeGridDay' && viewType !== 'timeGridWeek') return;
    if (!dragStateRef.current || edgeTriggeredRef.current) return;

    const wrapper = calendarWrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const EDGE_PX = 36;
    const nearRightEdge = e.clientX > rect.right - EDGE_PX && e.clientX <= rect.right + 15;
    const nearLeftEdge = e.clientX < rect.left + EDGE_PX && e.clientX >= rect.left - 15;

    if (nearRightEdge || nearLeftEdge) {
      // Mantén el cursor ~600ms cerca del borde antes de cambiar de día, para
      // que un simple roce al pasar por ahí no lo dispare sin querer.
      if (!edgeTimerRef.current) {
        const direction = nearRightEdge ? 1 : -1;
        edgeTimerRef.current = setTimeout(() => {
          advanceDraggedEventByDays(direction);
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

  // Swipe táctil para cambiar de día/semana (como Google Calendar), en las
  // vistas "Día" y "Semana". Solo móvil: son eventos touch, un ratón no los
  // dispara. Si el gesto no se decide como horizontal en los primeros
  // ~180ms, lo soltamos sin tocar nada, para no interferir con el
  // long-press que ya usa FullCalendar para seleccionar un hueco o
  // arrastrar un evento.
  useEffect(() => {
    const el = calendarWrapperRef.current;
    if (!el || (viewType !== 'timeGridDay' && viewType !== 'timeGridWeek')) return;

    const DIRECTION_THRESHOLD = 10; // px para empezar a decidir la dirección
    const DECIDE_TIME_LIMIT = 180; // ms; pasado esto, se lo dejamos a FullCalendar
    const SWIPE_THRESHOLD = 60; // px para que cuente como swipe de verdad

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

      const direction = dx < 0 ? 1 : -1;
      startDaySlide(direction);
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewType]);

  // El modal se encarga de crear/editar/borrar por su cuenta; solo nos
  // avisa cuando ha terminado con éxito, para cerrarlo y recargar.
  function handleModalSaved() {
    setModal(null);
    const api = calendarRef.current?.getApi();
    if (api) {
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
    }
    loadMonthDots(selectedDate);
  }

  if (!roleReady || loadingLists) {
    return <p className="text-sm text-gray-400">Cargando...</p>;
  }

  const clientOptions = [
    { id: ALL_VALUE, name: 'Todos los clientes' },
    ...clients.map((c) => ({ id: c._id, name: `${c.firstName} ${c.lastName}` })),
  ];

  // Punto de partida cómodo para "nueva sesión": tu propio usuario si eres
  // entrenador, o el primero marcado en el checklist si eres admin puro.
  const defaultTrainerId = isTrainer ? userId : selectedTrainerIds[0] || trainers[0]?._id || '';

  return (
    <div>
      {(isAdmin || isTrainer) && (
        <>
          {/* El botón "Filtros" vive en el toolbar del calendario (tanto en
              móvil como en escritorio); esto solo es la hoja que abre. */}
          {filtersOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
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
        style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
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
          className={`relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-4 ${
            viewType === 'timeGridWeek' ? 'ziti-week-view' : ''
          }`}
        >
          <p className="ziti-calendar-title mb-2 shrink-0 text-center font-[family-name:var(--font-work-sans)] text-sm font-bold capitalize text-[#2b2b2a] sm:text-left">
            {viewTitle}
          </p>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={isAdmin ? 'timeGridDay' : 'timeGridWeek'}
            firstDay={1}
            weekends={false}
            headerToolbar={{
              left: 'prev,next today',
              center: isTrainerPerspective ? 'filtros' : '',
              right: 'timeGridDay,timeGridWeek',
            }}
            customButtons={{
              // Mismo botón y misma hoja de filtros en móvil y escritorio.
              filtros: {
                text: 'Filtros',
                click: () => setFiltersOpen(true),
              },
            }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
            buttonText={{
              today: viewType === 'timeGridWeek' ? 'Esta semana' : 'Hoy',
              day: 'Día',
              week: 'Semana',
            }}
            locale="es"
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            height="100%"
            expandRows
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
            eventClassNames={(arg) =>
              arg.event.extendedProps.raw?.status === 'cancelled' ? ['ziti-event-cancelled'] : []
            }
            eventContent={(arg) => {
              const raw = arg.event.extendedProps.raw;
              const isCancelled = raw?.status === 'cancelled';
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
                  {isCancelled && viewType !== 'timeGridWeek' && (
                    <span className="ziti-event-cancelled-label">Cancelada</span>
                  )}
                  {raw?.notes && <div className="ziti-event-tooltip">{raw.notes}</div>}
                </div>
              );
            }}
          />
        </div>
      </div>

      <BookingModal
        modal={modal}
        trainers={trainers}
        clients={clients}
        defaultTrainerId={defaultTrainerId}
        onClose={() => setModal(null)}
        onSaved={handleModalSaved}
      />
    </div>
  );
}