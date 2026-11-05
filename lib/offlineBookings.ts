// Mismas firmas que lib/bookingsApi.ts, pero sin conexión la acción se
// guarda en cola local en vez de llamar a la API.
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
import { addToQueue, getQueue, newLocalId, removeFromQueue, PendingAction, PendingBookingEntry } from './offlineQueue';

function isOfflineError(err: unknown): boolean {
  return err instanceof Error && err.message === OFFLINE_MESSAGE;
}

// Varios toques a la misma sesión sin conexión se funden en una sola
// entrada de cola (los datos más recientes), no apilan una por toque.
async function enqueue(action: PendingAction, targetId: string | null, payload: any): Promise<string> {
  const queue = await getQueue();

  if (action === 'delete' || action === 'deleteSeries') {
    // Si era una sesión creada sin conexión y aún sin sincronizar, no hay
    // nada que borrar en el servidor: se quita de la cola entera.
    const createEntry = targetId ? queue.find((e) => e.action === 'create' && e.localId === targetId) : undefined;
    if (createEntry) {
      await removeFromQueue(createEntry.localId);
      return createEntry.localId;
    }
    // Cualquier edición pendiente de esa sesión deja de tener sentido.
    for (const e of queue) {
      if (e.targetId === targetId && e.action === 'update') {
        await removeFromQueue(e.localId);
      }
    }
  } else if (action === 'update' && targetId) {
    const existing = queue.find(
      (e) =>
        (e.action === 'update' && e.targetId === targetId) ||
        (e.action === 'create' && e.localId === targetId),
    );
    if (existing) {
      const merged: PendingBookingEntry = {
        ...existing,
        payload: { ...existing.payload, ...payload },
        createdAt: Date.now(),
      };
      await addToQueue(merged); // misma localId: reemplaza en vez de duplicar
      return existing.localId;
    }
  }

  const localId = newLocalId();
  await addToQueue({ localId, action, targetId, payload, createdAt: Date.now() });
  return localId;
}

export async function createBookingOrQueue(
  token: string,
  data: CreateBookingPayload,
): Promise<Booking & { _pendingSync?: boolean; _localId?: string }> {
  // Si navigator.onLine ya dice que no hay conexión, directo a la cola:
  // con mala cobertura, fetch() puede tardar mucho en rendirse por su cuenta.
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
    // page.tsx fabrica el evento visible desde la cola (applyPendingQueueToEvents).
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
