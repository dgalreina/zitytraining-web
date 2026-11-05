'use client';

import { useEffect, useRef, useState } from 'react';

// Hace que solo el bloque de contenido haga scroll, no la página entera:
// mide lo que ocupa la cabecera y el resto del alto es para él. 100dvh en
// vez de window.innerHeight (cuenta la barra de direcciones móvil); se
// mide en vez de restar un número fijo, que se desincroniza con la cabecera.
export function useContentHeight(bottomGap = 24) {
  const ref = useRef<HTMLDivElement>(null);
  const [topOffset, setTopOffset] = useState<number | null>(null);

  useEffect(() => {
    function recalcular() {
      const el = ref.current;
      if (!el) return;
      setTopOffset(el.getBoundingClientRect().top + bottomGap);
    }
    recalcular();
    window.addEventListener('resize', recalcular);
    return () => window.removeEventListener('resize', recalcular);
  }, [bottomGap]);

  return {
    ref,
    // Sin alto hasta la primera medida, para no dejar uno provisional
    // equivocado. overscrollBehavior quita el rebote de iOS al arrastrar
    // más allá del borde (igual que en app/dashboard/layout.tsx).
    style:
      topOffset !== null
        ? { height: `calc(100dvh - ${topOffset}px)`, overscrollBehavior: 'none' as const }
        : undefined,
  };
}
