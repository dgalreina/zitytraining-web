'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { OFFLINE_MESSAGE } from '@/lib/apiClient';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import {
  getQueue,
  removeFromQueue,
  PendingBookingEntry,
  QUEUE_CHANGED_EVENT,
} from '@/lib/offlineQueue';
import { createBooking, updateBooking, deleteBooking, deleteBookingSeries } from '@/lib/bookingsApi';

// Nunca compara versiones ni pregunta nada: lo que decidió el admin sin
// conexión gana siempre al sincronizar (acordado con el usuario).
async function syncOne(token: string, entry: PendingBookingEntry, localIdMap: Map<string, string>) {
  const targetId =
    entry.targetId && localIdMap.has(entry.targetId) ? localIdMap.get(entry.targetId)! : entry.targetId;

  if (entry.action === 'create') {
    const created = await createBooking(token, entry.payload);
    localIdMap.set(entry.localId, created._id);
  } else if (entry.action === 'update') {
    await updateBooking(token, targetId!, entry.payload);
  } else if (entry.action === 'delete') {
    await deleteBooking(token, targetId!);
  } else if (entry.action === 'deleteSeries') {
    await deleteBookingSeries(token, targetId!);
  }
}

function describeAction(action: PendingBookingEntry['action']) {
  if (action === 'create') return 'Crear sesión';
  if (action === 'update') return 'Editar sesión';
  return 'Borrar sesión';
}

export default function OfflineSyncBanner() {
  const isOnline = useOnlineStatus();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  // Tras vaciar la cola del todo: unos segundos en verde, luego se
  // desvanece sola en vez de desaparecer de golpe.
  const [justSynced, setJustSynced] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const fadeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => fadeTimers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setIsAdmin(JSON.parse(storedUser).roles?.includes('admin') ?? false);
    }
  }, []);

  function refreshCount() {
    getQueue().then((q) => setPendingCount(q.length)).catch(() => {});
  }

  useEffect(() => {
    refreshCount();
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshCount);
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, refreshCount);
  }, []);

  async function sync() {
    const token = localStorage.getItem('token');
    if (!token || syncing) return;
    const queue = await getQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    const localIdMap = new Map<string, string>();
    const newFailures: string[] = [];
    let stillOffline = false;

    for (const entry of queue) {
      try {
        await syncOne(token, entry, localIdMap);
        await removeFromQueue(entry.localId);
      } catch (err: any) {
        if (err?.message === OFFLINE_MESSAGE) {
          // Seguimos sin red de verdad (falso positivo del evento "online"
          // o se cortó otra vez): se deja el resto en cola para luego.
          stillOffline = true;
          break;
        }
        // Otro fallo (p.ej. la sesión ya no existe): se aparta, sin
        // bloquear el resto de la cola, y se quita para no reintentar algo
        // que no va a funcionar solo.
        newFailures.push(`${describeAction(entry.action)}: ${err?.message || 'No se pudo guardar'}`);
        await removeFromQueue(entry.localId);
      }
    }

    setSyncing(false);
    if (newFailures.length > 0) setFailures((prev) => [...prev, ...newFailures]);

    if (!stillOffline) {
      fadeTimers.current.forEach(clearTimeout);
      setFadingOut(false);
      setJustSynced(true);
      fadeTimers.current = [
        setTimeout(() => setFadingOut(true), 2500),
        setTimeout(() => {
          setJustSynced(false);
          setFadingOut(false);
        }, 2900),
      ];
    }
  }

  useEffect(() => {
    if (isOnline) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const showPendingOrOffline = !isOnline || (isAdmin && pendingCount > 0);
  const showSuccess = isOnline && isAdmin && justSynced && pendingCount === 0;

  if (!showPendingOrOffline && !showSuccess && failures.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      {showPendingOrOffline && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <WifiOff size={14} className="shrink-0" />
          <span>
            {isOnline ? 'Sincronizando...' : 'Sin conexión — viendo la última versión guardada'}
            {isAdmin && pendingCount > 0 && ` · ${pendingCount} cambio${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'} de sincronizar`}
          </span>
          {isOnline && isAdmin && pendingCount > 0 && (
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              Sincronizar ahora
            </button>
          )}
        </div>
      )}

      {showSuccess && (
        <div
          className={`flex items-center gap-2 rounded-lg bg-[#a2c037]/15 px-3 py-2 text-xs font-medium text-[#4b7a1f] transition-opacity duration-500 ${
            fadingOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Todo sincronizado</span>
        </div>
      )}

      {failures.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {failures.length} cambio{failures.length === 1 ? '' : 's'} no se{' '}
              {failures.length === 1 ? 'pudo' : 'pudieron'} guardar, revísalo{failures.length === 1 ? '' : 's'}:
            </span>
            <button
              type="button"
              onClick={() => setFailures([])}
              aria-label="Descartar avisos"
              className="shrink-0 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="list-disc pl-4">
            {failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
