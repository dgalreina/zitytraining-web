import { useEffect, useRef, type RefObject } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { updateBooking } from '@/lib/bookingsApi';

// Arrastrar una sesión hasta el borde de la pantalla, con el dedo aún
// pulsado, cambia de día/semana y la sesión se ve ya en la página nueva
// (imprescindible: no vale esperar a soltar el dedo). El "fantasma"
// duplicado que esto producía se arregló en fullcalendar-theme.css con
// un selector :has(), sin tocar nada de esta lógica.
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
  const edgeTriggeredRef = useRef(false);

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

  return { handleEventDragStart, handleEventDragStop };
}
