'use client';

import { useEffect, useRef, useState } from 'react';

// Hace que solo el bloque de contenido haga scroll, en vez de la página
// entera: se mide cuánto ocupa lo que queda por encima (título, filtros,
// pestañas...) y el resto del alto visible es para él.
//
// El alto se expresa en 100dvh y no con window.innerHeight porque en el
// móvil sí tiene en cuenta la barra de direcciones cuando se pliega. Y lo
// de arriba se mide en vez de restar un número fijo, que se desincroniza
// en cuanto cambia algo de la cabecera.
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
    // Hasta la primera medida no se fija alto, para no dejar un bloque
    // con una altura provisional equivocada.
    style: topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined,
  };
}
