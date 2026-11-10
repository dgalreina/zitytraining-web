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
  // Mover una sesión de serie espera a elegir "solo esta" o "esta y las
  // futuras" (MoveSeriesChoiceDialog) antes de guardar; si se cancela, se
  // deshace con info.revert().
  const [pendingDrop, setPendingDrop] = useState<any | null>(null);
  const [movingSeries, setMovingSeries] = useState(false);
  // Aviso con "Deshacer" tras mover, en vez de preguntar antes (como
  // Google Calendar). Guarda los valores de antes del arrastre para poder
  // repetir el mismo update() al revés.
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
  // Solo para vista "Semana" (en "Día" el fin de semana se ve siempre);
  // plegado por defecto para que quepa sin scroll horizontal en móvil.
  const [showWeekendsInWeek, setShowWeekendsInWeek] = useState(false);
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const gridRowRef = useRef<HTMLDivElement>(null);

  const isTrainerPerspective = isAdmin || isTrainer;
  const canEdit = isTrainerPerspective;
  // Sin conexión solo el admin sigue pudiendo editar (se guarda en cola).
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
  // fitEventText necesita los datos más recientes del evento, no los del
  // montaje: FullCalendar reutiliza el nodo DOM tras editar, y el closure
  // del observer se quedaría con datos viejos.
  const eventsRef = useRef<any[]>([]);
  useEffect(() => {
    eventsRef.current = displayEvents;
  }, [displayEvents]);

  const { handleEventDidMount, handleEventWillUnmount } = useFitEventText(eventsRef);

  // Para saber si "Enviar recordatorios" tiene algo que ofrecer (un admin
  // puede no impartir ninguna clase esa semana). Antes del return de
  // "Cargando...": declarado después, cambiaría el nº de hooks entre renders.
  const misRecordatorios = useMemo(
    () => construirRecordatorios(events, userId),
    [events, userId],
  );

  function handleDatesSet(info: any) {
    loadBookings(info.startStr, info.endStr);
    setSelectedDate(info.view.currentStart);
    // currentStart (no activeStart, que se corre al lunes con el finde
    // plegado) y como día suelto (no toISOString, que pasa a UTC y
    // movería la medianoche española al día anterior).
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

    // FullCalendar ya pintó la vista nueva: momento de deslizar la copia
    // congelada de la vieja hacia fuera (swipe o arrastre al borde).
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

  // Alto con 100dvh (sí cuenta la barra de direcciones móvil, a diferencia
  // de innerHeight); solo medimos en JS lo que ocupa lo de encima, para no
  // depender de un número fijo que se desincroniza si cambia algo arriba.
  // loadingLists en las deps: gridRowRef aún no existe cuando roleReady se
  // pone a true (antes de terminar de cargar), si no, el alto se queda
  // pegado al valor de repuesto.
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
    // isOnline/pendingQueue.length: el banner de "Sin conexión" empuja el
    // calendario hacia abajo; sin esto el alto no lo tendría en cuenta.
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
      // En cola (sin conexión) displayEvents no "cambia" de verdad (mismo
      // id/hora), así que no se repinta solo; se quita y se vuelve a
      // añadir para forzar a FullCalendar a tratarlo como nuevo.
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
        // Deshacer pasa por updateBookingOrQueue igual que cualquier
        // edición: funciona también sin conexión (se encola).
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
      // Sin recargar, el "raw" colgado del evento se queda con la hora
      // vieja y el modal de editar la mostraría mal. Sin conexión
      // loadBookings no trae nada, pero refreshPendingQueue sí recalcula.
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
            nowIndicator
            slotMinTime="07:00:00"
            slotMaxTime="23:59:00"
            height="100%"
            expandRows
            selectable={canEditOffline}
            selectLongPressDelay={200}
            // Más alto que selectLongPressDelay: mover una sesión existente
            // es más delicado que crear una (un toque confundido con un
            // arrastre la desplaza de verdad); 200ms colaba toques sueltos.
            // También da más margen al swipe de cambiar de día (ver
            // useSwipeNavigation) cuando empieza sobre una sesión: decide
            // en ~180ms, muy por debajo de este plazo.
            eventLongPressDelay={700}
            // Evita el filo gris de repintado en Safari/iOS al volver el
            // bloque a su sitio (con top/left, no transform) si no se guarda.
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

          {/* Recordatorios se mandan por semana entera, no día a día. */}
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
