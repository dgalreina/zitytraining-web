import { useCallback, useRef, type RefObject } from 'react';

// Deja preparada una copia congelada de la vista actual (para deslizarla
// fuera) y guarda la dirección; la animación de verdad se dispara con
// runPendingSlideAnimation, una vez FullCalendar ya ha pintado el día
// nuevo (dentro del datesSet del calendario). La usan tanto el swipe
// táctil como el arrastre de un evento hasta el borde de la pantalla.
export function useCalendarDaySlide(calendarWrapperRef: RefObject<HTMLDivElement | null>) {
  const pendingSlideDirectionRef = useRef<1 | -1 | null>(null);
  const slideCloneRef = useRef<HTMLElement | null>(null);

  // Devuelve si pudo prepararla (si no, el cambio de día sigue funcionando,
  // solo sin animar).
  const prepareDaySlide = useCallback(
    (direction: 1 | -1): boolean => {
      const container = calendarWrapperRef.current;
      const harness = container?.querySelector('.fc-view-harness') as HTMLElement | null;
      if (!container || !harness) return false;

      // Importante: el clon tiene que quedar DENTRO de .fc (como hermano
      // del .fc-view-harness real), no fuera. El CSS de FullCalendar usa
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
    },
    [calendarWrapperRef],
  );

  const runPendingSlideAnimation = useCallback(() => {
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
  }, [calendarWrapperRef]);

  return { prepareDaySlide, runPendingSlideAnimation };
}
