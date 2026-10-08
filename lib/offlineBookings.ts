// Mismas firmas que lib/bookingsApi.ts, pero si falla por falta de
// conexión (OFFLINE_MESSAGE, ver apiClient.ts) la acción se guarda en la
// cola local en vez de propagar el error. Pensado para el calendario, que
// es la única pantalla donde se puede editar sin conexión (y solo admin:
// eso se controla en quien llama, aquí no se distingue el rol).
import { OFFLINE_MESSAGE } from './apiClient';
import {
  Booking,
  CreateBookingPayload,
  UpdateBookingPayload,
  createBooking,
  updateBooking,
  deleteBooking,
  deleteBookingSeries,
} from './bookingsApi';
import { addToQueue, newLocalId, PendingBookingEntry } from './offlineQueue';

function isOfflineError(err: unknown): boolean {
  return err instanceof Error && err.message === OFFLINE_MESSAGE;
}

export async function createBookingOrQueue(
  token: string,
  data: CreateBookingPayload,
): Promise<Booking & { _pendingSync?: boolean; _localId?: string }> {
  try {
    return await createBooking(token, data);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const localId = newLocalId();
    const entry: PendingBookingEntry = {
      localId,
      action: 'create',
      targetId: null,
      payload: data,
      createdAt: Date.now(),
    };
    await addToQueue(entry);
    // No hay datos reales del servidor todavía: page.tsx fabrica el evento
    // visible a partir de la propia cola (ver applyPendingQueueToEvents),
    // así que aquí basta con devolver algo con el id local para encadenar.
    return { _pendingSync: true, _localId: localId } as Booking & {
      _pendingSync: boolean;
      _localId: string;
    };
  }
}

export async function updateBookingOrQueue(
  token: string,
  id: string,
  data: UpdateBookingPayload,
): Promise<(Booking & { _pendingSync?: boolean }) | { _pendingSync: true }> {
  try {
    return await updateBooking(token, id, data);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const entry: PendingBookingEntry = {
      localId: newLocalId(),
      action: 'update',
      targetId: id,
      payload: data,
      createdAt: Date.now(),
    };
    await addToQueue(entry);
    return { _pendingSync: true };
  }
}

export async function deleteBookingOrQueue(token: string, id: string): Promise<true> {
  try {
    return await deleteBooking(token, id);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const entry: PendingBookingEntry = {
      localId: newLocalId(),
      action: 'delete',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    };
    await addToQueue(entry);
    return true;
  }
}

export async function deleteBookingSeriesOrQueue(token: string, id: string): Promise<true> {
  try {
    return await deleteBookingSeries(token, id);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const entry: PendingBookingEntry = {
      localId: newLocalId(),
      action: 'deleteSeries',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    };
    await addToQueue(entry);
    return true;
  }
}
