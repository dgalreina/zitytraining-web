'use client';

import { useEffect, useRef, useState } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { getQueue, PendingBookingEntry, QUEUE_CHANGED_EVENT } from '@/lib/offlineQueue';

// Acciones hechas sin conexión (solo admin) que aún no se han mandado al
// servidor; se mezclan sobre "events" para que se vean al momento (ver
// applyPendingQueueToEvents en bookingEvents.ts) y las consume de verdad
// OfflineSyncBanner al recuperar conexión.
export function useOfflineCalendarQueue({
  calendarRef,
  selectedDate,
  loadBookings,
  loadMonthDots,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  selectedDate: Date;
  loadBookings: (fromStr: string, toStr: string) => Promise<void>;
  loadMonthDots: (monthDate: Date) => Promise<void>;
}) {
  const [pendingQueue, setPendingQueue] = useState<PendingBookingEntry[]>([]);

  function refreshPendingQueue() {
    getQueue().then(setPendingQueue).catch(() => {});
  }

  // Cuando la cola cambia porque OfflineSyncBanner acaba de sincronizar un
  // cambio de verdad con el servidor (no solo porque se encoló uno nuevo
  // sin conexión), "events" se queda con los datos de antes de
  // desconectarse: sin este refresco, al vaciarse la cola el calendario
  // volvía a enseñar la posición vieja de la sesión en vez de la ya
  // guardada. Pedirlo también cuando no hay red no hace daño: loadBookings
  // ya falla en silencio en ese caso.
  function handleQueueChanged() {
    refreshPendingQueue();
    const api = calendarRef.current?.getApi();
    if (api) {
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
    }
    loadMonthDots(selectedDate);
  }
  // El oyente de abajo se registra una sola vez (al montar), pero
  // handleQueueChanged usa loadBookings, que a su vez lee
  // selectedTrainerIds/selectedClientId/selectedDate del cierre de ESTE
  // render. Sin la referencia, el oyente se quedaría para siempre con la
  // versión de la primerísima carga (con selectedTrainerIds todavía
  // vacío, antes de que terminara de pedirse la lista de entrenadores):
  // cada sincronización pediría sesiones de "ningún entrenador" y
  // vaciaría el calendario entero. Guardando la última versión en una
  // referencia, el oyente (que no cambia) siempre llama a la actual.
  const handleQueueChangedRef = useRef(handleQueueChanged);
  useEffect(() => {
    handleQueueChangedRef.current = handleQueueChanged;
  });
  useEffect(() => {
    refreshPendingQueue();
    const listener = () => handleQueueChangedRef.current();
    window.addEventListener(QUEUE_CHANGED_EVENT, listener);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
  }, []);

  return { pendingQueue, refreshPendingQueue };
}
