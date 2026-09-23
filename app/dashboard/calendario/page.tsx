'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@/styles/fullcalendar-theme.css';
import { X, ChevronLeft, ChevronRight, Send, CalendarDays } from 'lucide-react';
import MiniCalendar, { dayKey } from '@/components/MiniCalendar';
import FilterDropdown from '@/components/FilterDropdown';
import BookingModal, { ModalState } from './BookingModal';
import WhatsAppRemindersModal, { construirRecordatorios } from './WhatsAppRemindersModal';
import TrainerMultiSelect from './TrainerMultiSelect';
import { useCalendarDaySlide } from './useCalendarDaySlide';
import { useEdgeDragNavigation } from './useEdgeDragNavigation';
import { useSwipeNavigation } from './useSwipeNavigation';
import { getUsers, getMe, getActiveClients } from '@/lib/usersApi';
import { getBookings, getBookingsByTrainers, updateBooking } from '@/lib/bookingsApi';
import { getHolidays } from '@/lib/holidaysApi';
import { INTERVIEW_COLOR, PRIVATE_COLOR } from '@/lib/colors';

const FALLBACK_COLOR = '#868585';
const ALL_VALUE = 'all';

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

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  // El ResizeObserver de fitEventText necesita los datos MÁS RECIENTES del
  // evento, no los que había en el momento en que se montó el elemento: si
  // FullCalendar reutiliza el mismo nodo del DOM tras una edición (en vez
  // de recrearlo), "info.event" capturado en el closure del observer se
  // queda con los datos viejos, y un resize posterior (p.ej. al cambiar de
  // vista) volvía a pintar el texto antiguo encima del ya corregido.
  const eventsRef = useRef<any[]>([]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Festivos (nacionales + Castilla y León automáticos, más los locales
  // que se añadan a mano en /dashboard/festivos): "YYYY-MM-DD" -> nombre.
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
        // Silencioso: si falla, simplemente no se marcan festivos ese año.
        loadedHolidayYearsRef.current.delete(year);
      });
  }
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [viewType, setViewType] = useState('timeGridWeek');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  // Solo aplica a la vista "Semana": en "Día" el fin de semana se ve
  // siempre. Se pliega por defecto para que la semana entre sin scroll
  // horizontal en la mayoría de móviles; el icono lo despliega.
  const [showWeekendsInWeek, setShowWeekendsInWeek] = useState(false);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const gridRowRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isTrainerPerspective = isAdmin || isTrainer;

  // Se cuentan aquí para saber si el botón de recordatorios tiene algo que
  // ofrecer: un admin puede estar viendo la semana entera de todos y no
  // impartir ninguna clase, y entonces no hay nada suyo que mandar.
  // Va con el resto de hooks, antes del "Cargando..." de más abajo: si se
  // declara después de ese return, React ve un número distinto de hooks
  // según la pasada y revienta la página.
  const misRecordatorios = useMemo(
    () => construirRecordatorios(events, userId),
    [events, userId],
  );

  // Un admin o entrenador puede crear/editar/borrar aunque el filtro esté
  // acotado a un cliente o entrenador concreto. El modal siempre pregunta
  // a qué entrenador pertenece cada sesión nueva, así que no hace falta
  // tener exactamente uno marcado en el checklist para poder crear.
  const canEdit = isTrainerPerspective;

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
          // El backend ya manda los favoritos primero; aquí solo se
          // desempata alfabéticamente dentro de cada grupo (favoritos /
          // resto), sin deshacer ese orden.
          const sortedClients = [...activeClients].sort((a: any, b: any) => {
            if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es');
          });
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

    if (b.isInterview) {
      // Entrevista con alguien que aún no es cliente: como una privada,
      // pero en beige para distinguirla.
      candidates = ['Entrevista'];
      color = INTERVIEW_COLOR;
    } else if (b.isPrivate) {
      // Sesión personal del entrenador: no lleva clientes, siempre en
      // salmón (independiente del color que tenga asignado el entrenador),
      // para que se distinga a simple vista de una sesión normal.
      candidates = ['Privada'];
      color = PRIVATE_COLOR;
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
    const eventId = info.event.id;
    function refit() {
      const current = eventsRef.current.find((e) => e.id === eventId);
      fitEventText(info.el, current ?? info.event);
    }
    refit();
    const ro = new ResizeObserver(refit);
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
      const data = await fetchFilteredBookings(token, fromStr, toStr);
      setEvents(data.map(bookingToEvent));
    } catch {
      // silencioso
    }
  }

  // El backend, cuando se le pide un cliente concreto, devuelve TODAS sus
  // sesiones sin mirar el filtro de entrenadores (son dos filtros que no
  // sabe combinar). Si además hay entrenadores marcados, se cruza aquí.
  async function fetchFilteredBookings(token: string, from: string, to: string): Promise<any[]> {
    if (selectedClientId !== ALL_VALUE) {
      if (selectedTrainerIds.length === 0) return [];
      const data = await getBookings(token, { client: selectedClientId, from, to });
      return data.filter((b: any) => selectedTrainerIds.includes(b.trainer?._id));
    }
    if (selectedTrainerIds.length > 0) {
      return getBookingsByTrainers(token, selectedTrainerIds, from, to);
    }
    return [];
  }

  async function loadMonthDots(monthDate: Date) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    try {
      const data = await fetchFilteredBookings(token, start.toISOString(), end.toISOString());
      const keys = new Set<string>(data.map((b: any) => dayKey(new Date(b.startTime))));
      setDaysWithBookings(keys);
    } catch {
      // silencioso
    }
  }

  function handleDatesSet(info: any) {
    loadBookings(info.startStr, info.endStr);
    setSelectedDate(info.view.currentStart);
    // Identifica la semana en el registro de recordatorios. Es
    // currentStart y no activeStart porque este último se corre al lunes
    // cuando el fin de semana está plegado, y entonces la misma semana
    // cambiaría de identidad según cómo tuvieras puesta la vista.
    //
    // Se manda como día suelto y no en ISO porque toISOString() pasa a UTC:
    // la medianoche del lunes en España es el domingo a las 22:00, y la
    // semana quedaría archivada con la fecha del día anterior.
    const lunes = info.view.currentStart as Date;
    setWeekStart(
      `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`,
    );
    setViewTitle(info.view.title);
    setViewType(info.view.type);
    loadHolidaysForYear(info.start.getFullYear());
    if (info.end.getFullYear() !== info.start.getFullYear()) {
      loadHolidaysForYear(info.end.getFullYear());
    }

    // Si el cambio de fecha viene de un swipe o de arrastrar hasta el
    // borde, FullCalendar ya ha terminado de pintar la vista nueva en este
    // punto: es el momento exacto de deslizar la copia congelada de la
    // vista vieja hacia fuera y la nueva hacia dentro.
    runPendingSlideAnimation();
  }

  const { prepareDaySlide, runPendingSlideAnimation } = useCalendarDaySlide(calendarWrapperRef);

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

  // Arrastrar una sesión hasta el borde de la pantalla cambia de día/semana
  // con el dedo aún pulsado; el swipe táctil hace lo mismo con un gesto.
  // Ambos comparten la animación de deslizamiento de useCalendarDaySlide.
  const { handleEventDragStart, handleEventDragStop } = useEdgeDragNavigation({
    calendarRef,
    calendarWrapperRef,
    viewType,
    prepareDaySlide,
    loadMonthDots,
  });

  useSwipeNavigation({ calendarWrapperRef, calendarRef, viewType, prepareDaySlide });

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

        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          ref={calendarWrapperRef}
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-4 ${
            viewType === 'timeGridWeek' ? 'ziti-week-view' : ''
          }`}
        >
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <p className="ziti-calendar-title flex-1 text-center font-[family-name:var(--font-work-sans)] text-sm font-bold capitalize text-[#2b2b2a] sm:text-left">
              {viewTitle}
            </p>
            {/* Solo en móvil: en escritorio ya está el mini calendario de la
                columna de la izquierda. Sin esto, para llegar a una fecha
                lejana había que pasar día a día o semana a semana. */}
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              title="Ir a una fecha"
              aria-label="Ir a una fecha"
              className="shrink-0 rounded-lg p-1 text-[#868585] transition hover:bg-gray-100 hover:text-[#2b2b2a] md:hidden"
            >
              <CalendarDays size={16} />
            </button>
            {viewType === 'timeGridWeek' && (
              <button
                type="button"
                onClick={() => setShowWeekendsInWeek((v) => !v)}
                title={showWeekendsInWeek ? 'Ocultar fin de semana' : 'Mostrar fin de semana'}
                className="shrink-0 rounded-lg p-1 text-[#868585] transition hover:bg-gray-100 hover:text-[#2b2b2a]"
              >
                {showWeekendsInWeek ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
          </div>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView={isAdmin ? 'timeGridDay' : 'timeGridWeek'}
            firstDay={1}
            weekends={viewType === 'timeGridDay' ? true : showWeekendsInWeek}
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
            eventLongPressDelay={200}
            // Sin esto, al soltar el dedo el bloque desliza 500ms de vuelta
            // a su sitio con top/left (no transform), lo que en Safari/iOS
            // puede provocar un filo gris de repintado durante el gesto.
            dragRevertDuration={0}
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
            eventClassNames={(arg) => {
              const classes: string[] = [];
              if (arg.event.extendedProps.raw?.status === 'cancelled') classes.push('ziti-event-cancelled');
              if (arg.event.extendedProps.raw?.holidaySkip) classes.push('ziti-event-holiday-skip');
              return classes;
            }}
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
                  {raw?.holidaySkip && viewType !== 'timeGridWeek' && (
                    <span className="ziti-event-holiday-skip-label">No cuenta (festivo)</span>
                  )}
                  {raw?.notes && <div className="ziti-event-tooltip">{raw.notes}</div>}
                </div>
              );
            }}
          />
        </div>

          {/* Solo en la vista de semana: los recordatorios se mandan de una
              tacada para toda la semana, no dia a dia. Y en modo cliente el
              calendario muestra entrenadores, no clientes, asi que ahi no
              hay a quien recordarle nada. */}
          {canEdit && viewType === 'timeGridWeek' && (
            <button
              type="button"
              onClick={() => setRemindersOpen(true)}
              disabled={misRecordatorios.length === 0}
              className="flex shrink-0 items-center gap-1.5 self-center rounded-lg border border-transparent bg-[#6aa842] px-2 py-1 text-[0.72rem] font-medium text-white hover:bg-[#5c9439] disabled:opacity-40 disabled:hover:bg-[#6aa842] sm:px-2.5 sm:py-1.5 sm:text-base"
            >
              <Send size={14} />
              Enviar recordatorios
            </button>
          )}
        </div>
      </div>

      {datePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 md:hidden"
          onClick={() => setDatePickerOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                Ir a una fecha
              </p>
              <button
                onClick={() => setDatePickerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <MiniCalendar
              selected={selectedDate}
              onChange={(date) => {
                handleMiniDateChange(date);
                setDatePickerOpen(false);
              }}
              onMonthChange={handleMiniMonthChange}
              daysWithBookings={daysWithBookings}
              highlightWeek={viewType === 'timeGridWeek'}
            />
          </div>
        </div>
      )}

      {remindersOpen && (
        <WhatsAppRemindersModal
          events={events}
          trainerId={userId}
          weekStart={weekStart}
          onClose={() => setRemindersOpen(false)}
        />
      )}

      <BookingModal
        modal={modal}
        trainers={trainers}
        clients={clients}
        defaultTrainerId={defaultTrainerId}
        holidaysByDate={holidaysByDate}
        onClose={() => setModal(null)}
        onSaved={handleModalSaved}
      />
    </div>
  );
}