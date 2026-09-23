import { useEffect, type RefObject } from 'react';
import type FullCalendar from '@fullcalendar/react';

// Swipe táctil para cambiar de día/semana (como Google Calendar), en las
// vistas "Día" y "Semana". Solo móvil: son eventos touch, un ratón no los
// dispara. Si el gesto no se decide como horizontal en los primeros
// ~180ms, lo soltamos sin tocar nada, para no interferir con el
// long-press que ya usa FullCalendar para seleccionar un hueco o
// arrastrar un evento.
export function useSwipeNavigation({
  calendarWrapperRef,
  calendarRef,
  viewType,
  prepareDaySlide,
}: {
  calendarWrapperRef: RefObject<HTMLDivElement | null>;
  calendarRef: RefObject<FullCalendar | null>;
  viewType: string;
  prepareDaySlide: (direction: 1 | -1) => boolean;
}) {
  useEffect(() => {
    const el = calendarWrapperRef.current;
    if (!el || (viewType !== 'timeGridDay' && viewType !== 'timeGridWeek')) return;

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
  }, [viewType, calendarWrapperRef, calendarRef, prepareDaySlide]);
}
