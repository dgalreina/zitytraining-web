import { useEffect, type RefObject } from 'react';
import type FullCalendar from '@fullcalendar/react';

// Swipe táctil para cambiar de día/semana (como Google Calendar), solo
// móvil (eventos touch). Si no se decide horizontal en ~180ms, se suelta
// sin tocar nada, para no pisar el long-press de FullCalendar.
export function useSwipeNavigation({
  calendarWrapperRef,
  calendarRef,
  viewType,
  prepareDaySlide,
  ready,
}: {
  calendarWrapperRef: RefObject<HTMLDivElement | null>;
  calendarRef: RefObject<FullCalendar | null>;
  viewType: string;
  prepareDaySlide: (direction: 1 | -1) => boolean;
  // Si el div de calendarWrapperRef ya existe (no durante "Cargando...").
  // Necesario como dependencia explícita: un ref no dispara re-render al
  // rellenarse, así que sin esto el efecto se queda enganchado a null
  // hasta que algo MÁS cambie viewType (el swipe no funcionaba al abrir,
  // solo tras cambiar de vista una vez).
  ready: boolean;
}) {
  useEffect(() => {
    const el = calendarWrapperRef.current;
    if (!ready || !el || (viewType !== 'timeGridDay' && viewType !== 'timeGridWeek')) return;

    const DIRECTION_THRESHOLD = 10; // px para empezar a decidir la dirección
    const DECIDE_TIME_LIMIT = 180; // ms; pasado esto, se lo dejamos a FullCalendar
    const SWIPE_THRESHOLD = 60; // px para que cuente como swipe de verdad

    let start: { x: number; y: number; time: number } | null = null;
    let decided: 'horizontal' | 'vertical' | 'abandoned' | null = null;

    function startDaySlide(direction: 1 | -1) {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      prepareDaySlide(direction);
      if (direction > 0) api.next();
      else api.prev();
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      // Antes esto se ignoraba entero si empezaba sobre una sesión, para
      // no competir con el long-press de FullCalendar. Pero eso dejaba
      // sin swipe cualquier zona con sesiones. Ahora se sigue igual que
      // en hueco libre: si en ~180ms (ver más abajo) no se decide
      // horizontal, se suelta sin tocar nada y el toque le llega entero
      // a FullCalendar (long-press, tap...), así que no compite.
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
      // Si el gesto empezó sobre una sesión, FullCalendar procesa este
      // mismo touchend a la vez (para decidir si fue un tap). Cambiar de
      // página ya mismo destruye esos elementos a medio procesar y lo
      // descarta en silencio; se deja acabar su ciclo primero.
      setTimeout(() => startDaySlide(direction), 0);
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [viewType, ready, calendarWrapperRef, calendarRef, prepareDaySlide]);
}
