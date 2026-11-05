import { PendingBookingEntry } from '@/lib/offlineQueue';
import { INTERVIEW_COLOR, PRIVATE_COLOR } from '@/lib/colors';

export const FALLBACK_COLOR = '#868585';

// De más a menos detallado: se usa el primero que quepa entero (partido
// en líneas si hace falta); si ninguno cabe, se muestra el más corto
// aunque se corte, pero el nombre nunca desaparece.
export function bookingToEvent(b: any) {
  let candidates: string[] = [];
  let color = FALLBACK_COLOR;

  if (b.isInterview) {
    // Como una privada, pero en beige para distinguirla.
    candidates = ['Entrevista'];
    color = INTERVIEW_COLOR;
  } else if (b.isPrivate) {
    // Siempre en salmón, independiente del color del entrenador.
    candidates = ['Privada'];
    color = PRIVATE_COLOR;
  } else {
    const clients = b.clients || [];
    const full = clients.map((c: any) => `${c.firstName} ${c.lastName}`).join(', ');
    const initials = clients
      .map((c: any) => `${c.firstName} ${c.lastName?.[0] ?? ''}.`)
      .join(', ');
    const short = clients.map((c: any) => c.firstName).join(', ');
    candidates = [full, initials, short];
    color = b.trainer?.color || FALLBACK_COLOR;
  }

  candidates = candidates.filter(Boolean);
  if (candidates.length === 0) candidates = ['Sesión'];

  return {
    id: b._id,
    title: candidates[0],
    start: b.startTime,
    end: b.endTime,
    color,
    extendedProps: { raw: b, candidates },
  };
}

// La cola offline lleva ids en crudo; bookingToEvent espera objetos
// poblados, se resuelven aquí contra las listas ya en memoria.
export function resolveTrainerRef(trainers: any[], id: string | undefined) {
  return (
    trainers.find((t) => t._id === id) || {
      _id: id,
      firstName: '',
      lastName: '',
      color: FALLBACK_COLOR,
    }
  );
}

export function resolveClientRefs(clients: any[], ids: string[] | undefined) {
  return (ids || []).map(
    (cid) => clients.find((c) => c._id === cid) || { _id: cid, firstName: '', lastName: '' },
  );
}

// Aplica la cola offline sobre los eventos ya cargados (crea/parchea/
// borra), para verlo al momento sin esperar a sincronizar.
export function applyPendingQueueToEvents(
  baseEvents: any[],
  queue: PendingBookingEntry[],
  trainers: any[],
  clients: any[],
) {
  let result = baseEvents;
  for (const entry of queue) {
    if (entry.action === 'create') {
      const raw = {
        _id: entry.localId,
        trainer: resolveTrainerRef(trainers, entry.payload.trainer),
        clients: resolveClientRefs(clients, entry.payload.clients),
        startTime: entry.payload.startTime,
        endTime: entry.payload.endTime,
        notes: entry.payload.notes,
        isPrivate: entry.payload.isPrivate,
        isInterview: entry.payload.isInterview,
        status: 'active',
      };
      const ev: any = bookingToEvent(raw);
      ev.extendedProps = { ...ev.extendedProps, pendingSync: true };
      result = [...result, ev];
    } else if (entry.action === 'update') {
      result = result.map((ev) => {
        if (ev.id !== entry.targetId) return ev;
        const mergedRaw = { ...ev.extendedProps.raw, ...entry.payload };
        if (entry.payload.trainer) mergedRaw.trainer = resolveTrainerRef(trainers, entry.payload.trainer);
        if (entry.payload.clients) mergedRaw.clients = resolveClientRefs(clients, entry.payload.clients);
        const merged: any = bookingToEvent(mergedRaw);
        merged.extendedProps = { ...merged.extendedProps, pendingSync: true };
        return merged;
      });
    } else if (entry.action === 'delete' || entry.action === 'deleteSeries') {
      result = result.filter((ev) => ev.id !== entry.targetId);
    }
  }
  return result;
}
