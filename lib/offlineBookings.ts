// Mismas firmas que lib/bookingsApi.ts, pero si no hay conexión la acción
// se guarda en la cola local en vez de llamar a la API. Pensado para el
// calendario, que es la única pantalla donde se puede editar sin conexión
// (y solo admin: eso se controla en quien llama, aquí no se distingue el
// rol).
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
import { addToQueue, newLocalId, PendingAction, PendingBookingEntry } from './offlineQueue';

function isOfflineError(err: unknown): boolean {
  return err instanceof Error && err.message === OFFLINE_MESSAGE;
}

async function enqueue(action: PendingAction, targetId: string | null, payload: any): Promise<string> {
  const localId = newLocalId();
  const entry: PendingBookingEntry = { localId, action, targetId, payload, createdAt: Date.now() };
  await addToQueue(entry);
  return localId;
}

export async function createBookingOrQueue(
  token: string,
  data: CreateBookingPayload,
): Promise<Booking & { _pendingSync?: boolean; _localId?: string }> {
  // Si ya se sabe que no hay conexión (navigator.onLine, lo mismo que hace
  // salir el aviso de "Sin conexión" arriba) ni se intenta la llamada real:
  // directo a la cola. Si se intentara igualmente, con mala cobertura
  // fetch() puede tardar mucho en rendirse por su cuenta, y hasta entonces
  // el cambio no se vería reflejado en el calendario.
  if (!navigator.onLine) {
    const localId = await enqueue('create', null, data);
    return { _pendingSync: true, _localId: localId } as Booking & {
      _pendingSync: boolean;
      _localId: string;
    };
  }
  try {
    return await createBooking(token, data);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    const localId = await enqueue('create', null, data);
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
  if (!navigator.onLine) {
    await enqueue('update', id, data);
    return { _pendingSync: true };
  }
  try {
    return await updateBooking(token, id, data);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    await enqueue('update', id, data);
    return { _pendingSync: true };
  }
}

export async function deleteBookingOrQueue(token: string, id: string): Promise<true> {
  if (!navigator.onLine) {
    await enqueue('delete', id, null);
    return true;
  }
  try {
    return await deleteBooking(token, id);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    await enqueue('delete', id, null);
    return true;
  }
}

export async function deleteBookingSeriesOrQueue(token: string, id: string): Promise<true> {
  if (!navigator.onLine) {
    await enqueue('deleteSeries', id, null);
    return true;
  }
  try {
    return await deleteBookingSeries(token, id);
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    await enqueue('deleteSeries', id, null);
    return true;
  }
}
