// Cola de acciones del calendario hechas sin conexión (solo admin). Se
// guarda en IndexedDB a mano (sin librería: el modelo es muy simple, una
// sola tabla) para que sobreviva a recargar la página mientras se sigue
// sin red.

const DB_NAME = 'zitytraining-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pendingBookingActions';

export type PendingAction = 'create' | 'update' | 'delete' | 'deleteSeries';

export interface PendingBookingEntry {
  localId: string;
  action: PendingAction;
  // null solo para 'create'; para el resto, el id real de la reserva.
  targetId: string | null;
  payload: any;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Evento propio para que la página del calendario (donde vive el estado de
// la cola en memoria) y OfflineSyncBanner (que la vacía al recuperar
// conexión, montado aparte en el layout) se enteren el uno del otro sin
// tener que compartir estado React entre componentes que no son
// padre/hijo.
export const QUEUE_CHANGED_EVENT = 'zitytraining:queue-changed';

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

export async function addToQueue(entry: PendingBookingEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyQueueChanged();
}

export async function getQueue(): Promise<PendingBookingEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const entries = (req.result as PendingBookingEntry[]) || [];
      entries.sort((a, b) => a.createdAt - b.createdAt);
      resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyQueueChanged();
}

export function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
