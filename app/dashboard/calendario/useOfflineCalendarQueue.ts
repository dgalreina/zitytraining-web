'use client';

import { useEffect, useRef, useState } from 'react';
import type FullCalendar from '@fullcalendar/react';
import { getQueue, PendingBookingEntry, QUEUE_CHANGED_EVENT } from '@/lib/offlineQueue';

// Acciones sin conexión aún no mandadas al servidor; se mezclan sobre
// "events" para verse al momento (applyPendingQueueToEvents en
// bookingEvents.ts), y OfflineSyncBanner las consume al recuperar conexión.
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

  // Cuando OfflineSyncBanner sincroniza de verdad, "events" se queda con
  // los datos de antes de desconectar; sin este refresco el calendario
  // mostraría la posición vieja. Pedirlo sin red no hace daño (loadBookings falla en silencio).
  function handleQueueChanged() {
    refreshPendingQueue();
    const api = calendarRef.current?.getApi();
    if (api) {
      loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
    }
    loadMonthDots(selectedDate);
  }
  // El oyente se registra una sola vez al montar, pero handleQueueChanged
  // cierra sobre loadBookings (que lee selectedTrainerIds/etc. de ESTE
  // render). Sin la ref, se quedaría para siempre con la versión de la
  // primera carga (selectedTrainerIds vacío) y cada sync vaciaría el calendario entero.
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
