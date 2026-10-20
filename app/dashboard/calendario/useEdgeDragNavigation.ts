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
  // Lado en el que está el cursor ahora mismo (o null si no está en
  // ninguno), para el ciclo de "sigue ahí -> repite" de abajo.
  const nearEdgeDirectionRef = useRef<1 | -1 | null>(null);
  const EDGE_DELAY_MS = 600;

  function clearEdgeTimer() {
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
  }

  // Tras cada cambio de página, si el cursor seguía en el mismo borde
  // (no se ha movido fuera desde entonces), se vuelve a armar el mismo
  // plazo para la siguiente: así, mientras se aguante en el borde, sigue
  // pasando de página cada EDGE_DELAY_MS, no solo una vez.
  function scheduleEdgeTick() {
    clearEdgeTimer();
    edgeTimerRef.current = setTimeout(() => {
      const direction = nearEdgeDirectionRef.current;
      if (direction === null || !dragStateRef.current) return;
      advanceDraggedEventByDays(direction);
    }, EDGE_DELAY_MS);
  }

  // direction: 1 = siguiente (borde derecho), -1 = anterior (borde izquierdo).
  // En vista "Semana" se desplaza 7 días (una semana entera) en vez de 1,
  // para caer en el mismo día de la semana siguiente/anterior.
  async function advanceDraggedEventByDays(direction: 1 | -1) {
    const drag = dragStateRef.current;
    const api = calendarRef.current?.getApi();
    if (!drag || !api) return;

    const daysShift = viewType === 'timeGridWeek' ? 7 : 1;
    const newStart = new Date(drag.start);
    newStart.setDate(newStart.getDate() + direction * daysShift);
    const newEnd = new Date(drag.end);
    newEnd.setDate(newEnd.getDate() + direction * daysShift);
    // Se guarda ya el nuevo hueco: si el cursor sigue en el borde y esto
    // se repite, el siguiente salto cuenta desde aquí, no otra vez desde
    // el sitio original.
    dragStateRef.current = { eventId: drag.eventId, start: newStart, end: newEnd };
    // Si seguimos en el mismo borde, se arma ya el siguiente plazo (no
    // hace falta esperar a un nuevo pointermove, que con el dedo quieto
    // no llegaría).
    scheduleEdgeTick();

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
    if (!dragStateRef.current) return;

    const wrapper = calendarWrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const EDGE_PX = 36;
    const nearRightEdge = e.clientX > rect.right - EDGE_PX && e.clientX <= rect.right + 15;
    const nearLeftEdge = e.clientX < rect.left + EDGE_PX && e.clientX >= rect.left - 15;
    const direction: 1 | -1 | null = nearRightEdge ? 1 : nearLeftEdge ? -1 : null;

    if (direction !== null) {
      // Mantén el cursor ~600ms cerca del borde antes de cambiar de día, para
      // que un simple roce al pasar por ahí no lo dispare sin querer. Si ya
      // estábamos en ese mismo borde (p.ej. moviéndose un poco dentro de la
      // misma zona), no se reinicia el plazo ya armado.
      if (nearEdgeDirectionRef.current !== direction) {
        nearEdgeDirectionRef.current = direction;
        scheduleEdgeTick();
      }
    } else {
      nearEdgeDirectionRef.current = null;
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
    nearEdgeDirectionRef.current = null;
    window.addEventListener('pointermove', stablePointerMoveHandler);
    // La vista Semana tiene su propio scroll horizontal nativo (red de
    // seguridad para pantallas muy estrechas, ver fullcalendar-theme.css).
    // Si la sesión arrastrada está en la última columna, ese scroll
    // competía con el propio arrastre. Se desactiva mientras se arrastra
    // y se repone al soltar.
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
