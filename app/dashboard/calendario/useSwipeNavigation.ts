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
  ready,
}: {
  calendarWrapperRef: RefObject<HTMLDivElement | null>;
  calendarRef: RefObject<FullCalendar | null>;
  viewType: string;
  prepareDaySlide: (direction: 1 | -1) => boolean;
  // Cuándo existe ya de verdad el div de calendarWrapperRef (no durante el
  // "Cargando..." inicial). Hace falta como dependencia explícita: un ref
  // no dispara un re-render al rellenarse solo, así que sin esto el efecto
  // se ejecuta primero con el div todavía sin montar, ve calendarWrapperRef
  // .current a null, y no hay nada que le avise para reintentarlo después
  // — se queda sin enganchar el swipe hasta que algo MÁS cambie viewType
  // de verdad (p.ej. tocar "Día"), que es justo el síntoma reportado: el
  // deslizamiento no funciona nada más abrir, pero en cuanto se cambia de
  // vista una vez, ya funciona siempre.
  ready: boolean;
}) {
  useEffect(() => {
    const el = calendarWrapperRef.current;
    if (!ready || !el || (viewType !== 'timeGridDay' && viewType !== 'timeGridWeek')) return;

    const DIRECTION_THRESHOLD = 10; // px para empezar a decidir la dirección
    const DECIDE_TIME_LIMIT = 180; // ms; pasado esto, se lo dejamos a FullCalendar
    const SWIPE_THRESHOLD = 60; // px para que cuente como swipe de verdad
    // Cuanto se tarda en asentar el cambio de semana (api.next()/prev() +
    // la animación de deslizar, ver useCalendarDaySlide: 260ms de
    // transición más margen). api.next()/prev() no tiene protección
    // propia — llamarlo dos veces seguidas avanza dos semanas — y en
    // Android un solo swipe físico podía disparar el touchend dos veces
    // (o llegar ya un touchstart nuevo) antes de que la animación
    // anterior terminara, saltando varias semanas de golpe. Mientras
    // "locked" esté activo, se ignora cualquier gesto nuevo.
    const NAVIGATION_LOCK_MS = 450;

    let start: { x: number; y: number; time: number } | null = null;
    let decided: 'horizontal' | 'vertical' | 'abandoned' | null = null;
    let locked = false;

    function startDaySlide(direction: 1 | -1) {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      locked = true;
      setTimeout(() => {
        locked = false;
      }, NAVIGATION_LOCK_MS);
      prepareDaySlide(direction);
      if (direction > 0) api.next();
      else api.prev();
    }

    function handleTouchStart(e: TouchEvent) {
      if (locked || e.touches.length !== 1) return;
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
      if (locked || !wasHorizontal || !startPoint) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startPoint.x;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      const direction = dx < 0 ? 1 : -1;
      startDaySlide(direction);
    }

    // Android a veces manda touchcancel en vez de (o además de) touchend
    // si el sistema se queda con el gesto a medias (p.ej. un scroll que
    // se activa a la vez): sin esto, start/decided no se limpiaban hasta
    // el siguiente touchstart.
    function handleTouchCancel() {
      start = null;
      decided = null;
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [viewType, ready, calendarWrapperRef, calendarRef, prepareDaySlide]);
}
