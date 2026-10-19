'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@/styles/fullcalendar-theme.css';
import { X, ChevronLeft, ChevronRight, Send, CalendarDays } from 'lucide-react';
import MiniCalendar, { dayKey } from '@/components/MiniCalendar';
import FilterDropdown from '@/components/FilterDropdown';
import BookingModal, { ModalState } from './BookingModal';
import MoveSeriesChoiceDialog from './MoveSeriesChoiceDialog';
import UndoMoveToast from './UndoMoveToast';
import WhatsAppRemindersModal, { construirRecordatorios } from './WhatsAppRemindersModal';
import TrainerMultiSelect from './TrainerMultiSelect';
import { useCalendarDaySlide } from './useCalendarDaySlide';
import { useEdgeDragNavigation } from './useEdgeDragNavigation';
import { useSwipeNavigation } from './useSwipeNavigation';
import { useCalendarData, ALL_VALUE } from './useCalendarData';
import { useOfflineCalendarQueue } from './useOfflineCalendarQueue';
import { useFitEventText } from './useFitEventText';
import { applyPendingQueueToEvents, FALLBACK_COLOR } from './bookingEvents';
import { updateBookingOrQueue } from '@/lib/offlineBookings';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export default function CalendarioPage() {
  const isOnline = useOnlineStatus();

  const {
    userId,
    isAdmin,
    isTrainer,
    roleReady,
    trainers,
    clients,
    selectedTrainerIds,
    setSelectedTrainerIds,
    selectedClientId,
    setSelectedClientId,
    loadingLists,
    events,
    loadBookings,
    daysWithBookings,
    loadMonthDots,
    holidaysByDate,
    loadHolidaysForYear,
  } = useCalendarData();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modal, setModal] = useState<ModalState>(null);
  // Arrastrar una sesión de una serie no se guarda al momento: se espera a
  // que el usuario elija "solo esta" o "esta y todas las futuras" (ver
  // MoveSeriesChoiceDialog). FullCalendar ya la ha movido en pantalla para
  // entonces; si se cancela, se deshace con el propio info.revert().
  const [pendingDrop, setPendingDrop] = useState<any | null>(null);
  const [movingSeries, setMovingSeries] = useState(false);
  // Tras mover una sesión arrastrando, un aviso con "Deshacer" (como
  // Google Calendar) en vez de preguntar antes de mover. Guarda lo
  // necesario para repetir el mismo update() con los valores de antes del
  // arrastre: para una serie, el propio shiftKeepingWeekPattern del
  // backend deshace el desplazamiento igual de bien en sentido contrario.
  const [undoToast, setUndoToast] = useState<{
    id: number;
    message: string;
    bookingId: string;
    originalStart: string;
    originalEnd: string;
    appliedToSeries: boolean;
  } | null>(null);
  const undoToastIdRef = useRef(0);
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

  const isTrainerPerspective = isAdmin || isTrainer;
  // Un admin o entrenador puede crear/editar/borrar aunque el filtro esté
  // acotado a un cliente o entrenador concreto. El modal siempre pregunta
  // a qué entrenador pertenece cada sesión nueva, así que no hace falta
  // tener exactamente uno marcado en el checklist para poder crear.
  const canEdit = isTrainerPerspective;
  // Sin conexión solo el admin puede seguir creando/moviendo/borrando
  // sesiones (se guardan en cola); el resto de roles pasan a solo lectura.
  const canEditOffline = isOnline ? canEdit : isAdmin;

  const { pendingQueue, refreshPendingQueue } = useOfflineCalendarQueue({
    calendarRef,
    selectedDate,
    loadBookings,
    loadMonthDots,
  });

  const displayEvents = useMemo(
    () => applyPendingQueueToEvents(events, pendingQueue, trainers, clients),
    [events, pendingQueue, trainers, clients],
  );
  // El ResizeObserver de fitEventText necesita los datos MÁS RECIENTES del
  // evento, no los que había en el momento en que se montó el elemento: si
  // FullCalendar reutiliza el mismo nodo del DOM tras una edición (en vez
  // de recrearlo), "info.event" capturado en el closure del observer se
  // queda con los datos viejos, y un resize posterior (p.ej. al cambiar de
  // vista) volvía a pintar el texto antiguo encima del ya corregido.
  const eventsRef = useRef<any[]>([]);
  useEffect(() => {
    eventsRef.current = displayEvents;
  }, [displayEvents]);

  const { handleEventDidMount, handleEventWillUnmount } = useFitEventText(eventsRef);

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
    // isOnline/pendingQueue.length: el banner de "Sin conexión" (montado en
    // el layout, por encima de este componente) ocupa una línea más y
    // empuja el calendario hacia abajo; sin esto, el alto se quedaba
    // calculado como si el banner no estuviera, tapando el botón de
    // "Enviar recordatorios".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleReady, loadingLists, isOnline, pendingQueue.length]);

  function handleMiniDateChange(date: Date | null) {
    if (!date) return;
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  }

  function handleMiniMonthChange(date: Date) {
    loadMonthDots(date);
  }

  function openCreateModal(start: Date) {
    if (!canEditOffline) return;
    setModal({ mode: 'create', start });
  }

  function openEditModal(raw: any) {
    if (!canEditOffline) return;
    setModal({ mode: 'edit', booking: raw, start: new Date(raw.startTime) });
  }

  function handleSelect(selectInfo: any) {
    openCreateModal(selectInfo.start);
    selectInfo.view.calendar.unselect();
  }

  function handleEventClick(clickInfo: any) {
    openEditModal(clickInfo.event.extendedProps.raw);
  }

  function handleEventDrop(info: any) {
    // Solo tiene sentido preguntar "esta o las futuras" si de verdad hay
    // una serie detrás; una sesión suelta se mueve y se guarda sin más.
    if (info.event.extendedProps?.raw?.series) {
      setPendingDrop(info);
      return;
    }
    commitEventDrop(info, false);
  }

  function cancelPendingDrop() {
    pendingDrop?.revert();
    setPendingDrop(null);
  }

  async function confirmPendingDrop(applyTimeToSeries: boolean) {
    const info = pendingDrop;
    if (!info) return;
    setMovingSeries(true);
    try {
      await commitEventDrop(info, applyTimeToSeries);
    } finally {
      setMovingSeries(false);
      setPendingDrop(null);
    }
  }

  async function commitEventDrop(info: any, applyTimeToSeries: boolean) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const result: any = await updateBookingOrQueue(token, info.event.id, {
        startTime: info.event.start.toISOString(),
        endTime: info.event.end.toISOString(),
        applyTimeToSeries,
      });
      // Si se quedó en cola (sin conexión), FullCalendar ya movió este
      // evento a mano por el propio arrastre, así que displayEvents no lo
      // "cambia" de verdad (mismo id, misma hora) y a veces no vuelve a
      // pasar por eventClassNames hasta el siguiente remontado.
      // setExtendedProp por sí solo no bastaba (FullCalendar sigue
      // "asentando" el arrastre justo después de soltarlo y a veces no
      // repinta ese evento concreto), así que se quita y se vuelve a
      // añadir con el dato actualizado: así FullCalendar lo trata como
      // nuevo y lo pinta de cero, con el filo ya puesto.
      if (result?._pendingSync) {
        const calApi = calendarRef.current?.getApi();
        if (calApi && info.event.start && info.event.end) {
          const rebuilt = {
            id: info.event.id,
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            color: info.event.backgroundColor,
            extendedProps: { ...info.event.extendedProps, pendingSync: true },
          };
          info.event.remove();
          calApi.addEvent(rebuilt);
        }
      }
      if (info.oldEvent?.start && info.oldEvent?.end) {
        // Deshacer funciona igual sin conexión: vuelve a pasar por
        // updateBookingOrQueue con la hora de antes, así que se encola
        // (o se funde con el cambio ya en cola) y se aplica del todo en
        // cuanto sincronice, igual que cualquier otra edición offline.
        undoToastIdRef.current += 1;
        setUndoToast({
          id: undoToastIdRef.current,
          message: applyTimeToSeries ? 'Sesión y futuras movidas' : 'Sesión movida',
          bookingId: info.event.id,
          originalStart: info.oldEvent.start.toISOString(),
          originalEnd: info.oldEvent.end.toISOString(),
          appliedToSeries: applyTimeToSeries,
        });
      }
      // Sin esto, el "raw" que lleva colgado el evento (con la hora vieja)
      // se queda tal cual, y si reabres el modal para editar te sale la
      // hora/día de antes de arrastrar, aunque el evento ya se vea movido.
      // Si no hay conexión loadBookings no trae nada nuevo (falla en
      // silencio), pero refreshPendingQueue hace que displayEvents
      // recalcule con la hora nueva de todos modos.
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
      refreshPendingQueue();
    } catch (err: any) {
      alert(err.message || 'No se pudo mover la sesión');
      info.revert();
    }
  }

  async function handleUndoMove() {
    const toast = undoToast;
    setUndoToast(null);
    if (!toast) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateBookingOrQueue(token, toast.bookingId, {
        startTime: toast.originalStart,
        endTime: toast.originalEnd,
        applyTimeToSeries: toast.appliedToSeries,
      });
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
      refreshPendingQueue();
    } catch (err: any) {
      alert(err.message || 'No se pudo deshacer el movimiento');
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

  useSwipeNavigation({
    calendarWrapperRef,
    calendarRef,
    viewType,
    prepareDaySlide,
    ready: roleReady && !loadingLists,
  });

  // El modal se encarga de crear/editar/borrar por su cuenta; solo nos
  // avisa cuando ha terminado con éxito, para cerrarlo y recargar.
  function handleModalSaved() {
    setModal(null);
    const api = calendarRef.current?.getApi();
    if (api) {
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
    }
    loadMonthDots(selectedDate);
    refreshPendingQueue();
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
        className="flex h-[calc(100dvh-190px)] gap-5 transition-[height] duration-300 ease-out"
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
            // En "Día" cabe de sobra el nombre completo ("martes 20"); en
            // "Semana" hay 7 columnas, así que se queda abreviado ("mar 20").
            dayHeaderFormat={
              viewType === 'timeGridDay'
                ? { weekday: 'long', day: 'numeric' }
                : { weekday: 'short', day: 'numeric' }
            }
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
            slotMaxTime="23:59:00"
            height="100%"
            expandRows
            selectable={canEditOffline}
            selectLongPressDelay={200}
            // Más alto que selectLongPressDelay a propósito: mover una
            // sesión ya existente es más delicado que crear una nueva (si
            // se confunde un toque con el inicio de un arrastre, aquí se
            // desplaza de verdad una sesión real). 200ms quedaba demasiado
            // cerca de lo que tarda un toque normal en un móvil, y algún
            // toque se colaba como un arrastre mínimo.
            eventLongPressDelay={500}
            // Sin esto, al soltar el dedo el bloque desliza 500ms de vuelta
            // a su sitio con top/left (no transform), lo que en Safari/iOS
            // puede provocar un filo gris de repintado durante el gesto.
            dragRevertDuration={0}
            eventStartEditable={canEditOffline}
            eventDurationEditable={false}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventDragStart={handleEventDragStart}
            eventDragStop={handleEventDragStop}
            eventDidMount={handleEventDidMount}
            eventWillUnmount={handleEventWillUnmount}
            datesSet={handleDatesSet}
            events={displayEvents}
            eventColor={FALLBACK_COLOR}
            slotEventOverlap={false}
            slotDuration="00:30:00"
            snapDuration="00:05:00"
            displayEventTime={false}
            eventClassNames={(arg) => {
              const classes: string[] = [];
              if (arg.event.extendedProps.raw?.status === 'cancelled') classes.push('ziti-event-cancelled');
              if (arg.event.extendedProps.raw?.holidaySkip) classes.push('ziti-event-holiday-skip');
              if (arg.event.extendedProps.pendingSync) classes.push('ziti-event-pending-sync');
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

      {undoToast && (
        <UndoMoveToast
          key={undoToast.id}
          message={undoToast.message}
          onUndo={handleUndoMove}
          onDismiss={() => setUndoToast(null)}
        />
      )}

      <MoveSeriesChoiceDialog
        open={!!pendingDrop}
        onCancel={cancelPendingDrop}
        onMoveOnly={() => confirmPendingDrop(false)}
        onMoveSeries={() => confirmPendingDrop(true)}
        saving={movingSeries}
      />

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
