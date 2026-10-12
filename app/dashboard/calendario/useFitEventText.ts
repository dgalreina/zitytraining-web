// Recorta el contenido de un evento del calendario según el espacio real
// disponible: nombre completo -> solo nombre, dejando que el texto se
// parta en varias líneas si hace falta (nunca desaparece del todo, como
// mucho se corta a medias si de verdad no cabe ni en alto); hora -> se
// oculta si no cabe.
function fitEventText(el: HTMLElement, event: any) {
  const boxEl = el.querySelector('.ziti-event-box') as HTMLElement | null;
  const nameEl = el.querySelector('.ziti-event-name') as HTMLElement | null;
  const timeEl = el.querySelector('.ziti-event-time') as HTMLElement | null;
  if (!boxEl || !nameEl) return;

  const candidates: string[] = event.extendedProps?.candidates?.length
    ? event.extendedProps.candidates
    : [event.title];

  // El propio texto nunca desborda de sí mismo (crece a su contenido), así
  // que hay que medir el desbordamiento contra la caja real (que sí tiene
  // alto fijo y overflow:hidden), no contra el texto.
  function tryFitName(): boolean {
    for (const candidate of candidates) {
      nameEl!.textContent = candidate;
      if (boxEl!.scrollHeight <= boxEl!.clientHeight) return true;
    }
    return false;
  }

  // Hora: si no cabe de ancho, se quita directamente.
  if (timeEl) {
    timeEl.style.display = '';
    if (timeEl.scrollWidth > timeEl.clientWidth) {
      timeEl.style.display = 'none';
    }
  }

  let fits = tryFitName();

  // Si ni el nombre más corto cabe con la hora todavía visible, la
  // quitamos: el nombre importa más y necesita todo el alto disponible.
  if (!fits && timeEl && timeEl.style.display !== 'none') {
    timeEl.style.display = 'none';
    fits = tryFitName();
  }

  // Aun así no cabe entero (caja diminuta): nos quedamos con el más corto,
  // aunque se corte, para que el nombre nunca desaparezca del todo.
  if (!fits) {
    nameEl.textContent = candidates[candidates.length - 1];
  }
}

// `eventsRef` lleva siempre los datos MÁS RECIENTES de los eventos
// (incluidos los pendientes de sincronizar): el ResizeObserver no puede
// fiarse de "info.event" capturado en su propio closure, porque si
// FullCalendar reutiliza el mismo nodo del DOM tras una edición (en vez de
// recrearlo), ese closure se queda con los datos de cuando se montó.
export function useFitEventText(eventsRef: { current: any[] }) {
  function handleEventDidMount(info: any) {
    const eventId = info.event.id;
    function refit() {
      const current = eventsRef.current.find((e) => e.id === eventId);
      fitEventText(info.el, current ?? info.event);
    }
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(info.el);
    (info.el as any).__zitiResizeObserver = ro;
  }

  function handleEventWillUnmount(info: any) {
    (info.el as any).__zitiResizeObserver?.disconnect();
  }

  return { handleEventDidMount, handleEventWillUnmount };
}
