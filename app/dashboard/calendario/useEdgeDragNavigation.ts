import { useEffect, useRef, type RefObject } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { updateBooking } from '@/lib/bookingsApi';

// Arrastrar una sesión hasta el borde cambia de día/semana con el dedo aún
// pulsado (no vale esperar a soltarlo). El "fantasma" duplicado que esto
// producía se arregló en fullcalendar-theme.css con un selector :has().
export function useEdgeDragNavigation({
  calendarRef,
  calendarWrapperRef,
  viewType,
  prepareDaySlide,
  loadMonthDots,
}: {
  calendarRef: RefObject<FullCalendar | null>;
  calendarWrapperRef: RefObject<HTMLDivElement | null>;
  viewType: string;
  prepareDaySlide: (direction: 1 | -1) => boolean;
  loadMonthDots: (date: Date) => void;
}) {
  const dragStateRef = useRef<{ eventId: string; start: Date; end: Date } | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Lado donde está el cursor ahora (o null), para el ciclo "sigue ahí -> repite".
  const nearEdgeDirectionRef = useRef<1 | -1 | null>(null);
  const EDGE_DELAY_MS = 600;

  function clearEdgeTimer() {
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
  }

  // Si el cursor sigue en el borde tras cambiar de página, se rearma para
  // la siguiente: así repite cada EDGE_DELAY_MS mientras se aguante ahí.
  function scheduleEdgeTick() {
    clearEdgeTimer();
    edgeTimerRef.current = setTimeout(() => {
      const direction = nearEdgeDirectionRef.current;
      if (direction === null || !dragStateRef.current) return;
      advanceDraggedEventByDays(direction);
    }, EDGE_DELAY_MS);
  }

  // direction: 1 = siguiente (derecha), -1 = anterior (izquierda).
  async function advanceDraggedEventByDays(direction: 1 | -1) {
    const drag = dragStateRef.current;
    const api = calendarRef.current?.getApi();
    if (!drag || !api) return;

    const daysShift = viewType === 'timeGridWeek' ? 7 : 1;
    const newStart = new Date(drag.start);
    newStart.setDate(newStart.getDate() + direction * daysShift);
    const newEnd = new Date(drag.end);
    newEnd.setDate(newEnd.getDate() + direction * daysShift);
    // Para que el siguiente salto cuente desde aquí, no desde el original.
    dragStateRef.current = { eventId: drag.eventId, start: newStart, end: newEnd };
    // Rearma ya el siguiente plazo: con el dedo quieto no llegaría otro pointermove.
    scheduleEdgeTick();

    prepareDaySlide(direction);
    if (direction > 0) api.next();
    else api.prev();
    // Fecha real del calendario, no "selectedDate" (congelado del primer render).
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
    if (!dragStateRef.current) return;

    const wrapper = calendarWrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const EDGE_PX = 36;
    const nearRightEdge = e.clientX > rect.right - EDGE_PX && e.clientX <= rect.right + 15;
    const nearLeftEdge = e.clientX < rect.left + EDGE_PX && e.clientX >= rect.left - 15;
    const direction: 1 | -1 | null = nearRightEdge ? 1 : nearLeftEdge ? -1 : null;

    if (direction !== null) {
      // ~600ms cerca del borde antes de cambiar, para que un roce no lo
      // dispare sin querer; si ya estábamos en ese borde no se reinicia.
      if (nearEdgeDirectionRef.current !== direction) {
        nearEdgeDirectionRef.current = direction;
        scheduleEdgeTick();
      }
    } else {
      nearEdgeDirectionRef.current = null;
      clearEdgeTimer();
    }
  }

  // Ref con identidad estable para window.addEventListener; delega a la
  // versión más reciente de la lógica (que sí depende de props/estado).
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
    nearEdgeDirectionRef.current = null;
    window.addEventListener('pointermove', stablePointerMoveHandler);
    // Desactiva el scroll horizontal nativo de la vista Semana (ver
    // fullcalendar-theme.css): competía con el arrastre en la última columna.
    calendarWrapperRef.current?.classList.add('ziti-dragging-event');
  }

  function handleEventDragStop() {
    window.removeEventListener('pointermove', stablePointerMoveHandler);
    clearEdgeTimer();
    nearEdgeDirectionRef.current = null;
    dragStateRef.current = null;
    calendarWrapperRef.current?.classList.remove('ziti-dragging-event');
  }

  return { handleEventDragStart, handleEventDragStop };
}
