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
    // Entrevista con alguien que aún no es cliente: como una privada,
    // pero en beige para distinguirla.
    candidates = ['Entrevista'];
    color = INTERVIEW_COLOR;
  } else if (b.isPrivate) {
    // Sesión personal del entrenador: no lleva clientes, siempre en
    // salmón (independiente del color que tenga asignado el entrenador),
    // para que se distinga a simple vista de una sesión normal.
    candidates = ['Privada'];
    color = PRIVATE_COLOR;
  } else {
    // Nombres de clientes, color del entrenador de esa sesión concreta
    // (funciona igual con 1, varios, o todos los entrenadores marcados)
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

// Un payload de la cola offline lleva ids en crudo (trainer: string,
// clients: string[]); bookingToEvent espera los objetos ya poblados, así
// que se resuelven aquí contra las listas ya cargadas en memoria para los
// desplegables de filtro.
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

// Aplica, por orden, la cola de acciones sin sincronizar sobre la lista de
// eventos ya cargada: añade las creadas offline, parchea las editadas y
// quita las borradas. Así el admin ve al momento lo que ha hecho sin
// conexión, sin esperar a que sincronice de verdad.
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
