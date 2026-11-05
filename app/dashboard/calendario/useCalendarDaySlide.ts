import { useCallback, useRef, type RefObject } from 'react';

// Congela una copia de la vista actual para deslizarla fuera; la
// animación de verdad la dispara runPendingSlideAnimation, una vez
// FullCalendar ya pintó el día nuevo (dentro de datesSet). La usan el
// swipe y el arrastre al borde.
export function useCalendarDaySlide(calendarWrapperRef: RefObject<HTMLDivElement | null>) {
  const pendingSlideDirectionRef = useRef<1 | -1 | null>(null);
  const slideCloneRef = useRef<HTMLElement | null>(null);

  // Devuelve si pudo prepararla; si no, el cambio de día sigue sin animar.
  const prepareDaySlide = useCallback(
    (direction: 1 | -1): boolean => {
      const container = calendarWrapperRef.current;
      const harness = container?.querySelector('.fc-view-harness') as HTMLElement | null;
      if (!container || !harness) return false;

      // El clon debe quedar DENTRO de .fc (hermano del harness real): el
      // CSS de FullCalendar exige ese ancestro, si no calcula mal la altura.
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
      // cloneNode no copia el scroll interno, hay que replicarlo.
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
