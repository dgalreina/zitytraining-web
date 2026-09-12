'use client';

import { useState } from 'react';
import { X, Trash2, Send, Pencil } from 'lucide-react';

interface Sesion {
  start: Date;
  end: Date;
}

export interface Recordatorio {
  clientId: string;
  nombre: string;
  mensaje: string;
}

function duracion(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

function fechaLarga(d: Date) {
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function hora(d: Date) {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function redactar(nombre: string, sesiones: Sesion[]) {
  const linea = (s: Sesion) => {
    const mins = Math.round((s.end.getTime() - s.start.getTime()) / 60000);
    return `${fechaLarga(s.start)} a las ${hora(s.start)} (${duracion(mins)})`;
  };

  if (sesiones.length === 1) {
    return `Hola ${nombre}, te recordamos que tienes una sesión el ${linea(sesiones[0])}. ¡Te esperamos!`;
  }
  return [
    `Hola ${nombre}, te recordamos tus próximas sesiones:`,
    ...sesiones.map((s) => `· ${linea(s)}`),
    '¡Te esperamos!',
  ].join('\n');
}

// Un mensaje por cliente, no por sesión: si alguien entrena tres días esa
// semana recibe un solo WhatsApp con las tres. Las sesiones privadas del
// entrenador no llevan cliente, así que se quedan fuera.
export function construirRecordatorios(events: any[]): Recordatorio[] {
  const porCliente = new Map<string, { nombre: string; sesiones: Sesion[] }>();

  for (const evento of events) {
    const reserva = evento?.extendedProps?.raw;
    if (!reserva || reserva.isPrivate) continue;

    for (const cliente of reserva.clients || []) {
      const id = typeof cliente === 'string' ? cliente : cliente._id;
      if (!id) continue;
      const nombre = cliente.firstName || 'cliente';
      const actual = porCliente.get(id) || { nombre, sesiones: [] as Sesion[] };
      actual.sesiones.push({
        start: new Date(reserva.startTime),
        end: new Date(reserva.endTime),
      });
      porCliente.set(id, actual);
    }
  }

  return Array.from(porCliente.entries())
    .map(([clientId, { nombre, sesiones }]) => {
      const ordenadas = [...sesiones].sort((a, b) => a.start.getTime() - b.start.getTime());
      return { clientId, nombre, mensaje: redactar(nombre, ordenadas) };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export default function WhatsAppRemindersModal({
  events,
  viewType,
  onClose,
}: {
  events: any[];
  viewType: string;
  onClose: () => void;
}) {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(() =>
    construirRecordatorios(events),
  );
  const [editando, setEditando] = useState<string | null>(null);

  const ambito = viewType === 'timeGridDay' ? 'de este día' : 'de esta semana';

  function editar(clientId: string, mensaje: string) {
    setRecordatorios((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, mensaje } : r)),
    );
  }

  function quitar(clientId: string) {
    setRecordatorios((prev) => prev.filter((r) => r.clientId !== clientId));
    if (editando === clientId) setEditando(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <p className="font-[family-name:var(--font-work-sans)] text-[15px] font-bold text-[#2b2b2a]">
              Recordatorios por WhatsApp
            </p>
            <p className="mt-0.5 text-xs text-[#868585]">
              {recordatorios.length === 0
                ? `No hay clientes ${ambito}`
                : `${recordatorios.length} ${recordatorios.length === 1 ? 'cliente' : 'clientes'} ${ambito}`}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {recordatorios.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No hay sesiones con clientes en la vista actual.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recordatorios.map((r) => (
                <div key={r.clientId} className="rounded-xl border border-gray-100 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#2b2b2a]">{r.nombre}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setEditando(editando === r.clientId ? null : r.clientId)}
                        aria-label={`Editar mensaje de ${r.nombre}`}
                        className={`flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 ${
                          editando === r.clientId ? 'text-[#4b7a1f]' : 'text-[#868585]'
                        }`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => quitar(r.clientId)}
                        aria-label={`Quitar a ${r.nombre}`}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {editando === r.clientId ? (
                    <textarea
                      value={r.mensaje}
                      onChange={(e) => editar(r.clientId, e.target.value)}
                      rows={Math.min(8, r.mensaje.split('\n').length + 1)}
                      autoFocus
                      className="w-full resize-none rounded-lg border border-gray-200 p-2.5 text-[13px] leading-relaxed text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                    />
                  ) : (
                    <p className="whitespace-pre-line rounded-lg bg-[#f7f7f5] p-2.5 text-[13px] leading-relaxed text-[#2b2b2a]">
                      {r.mensaje}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#868585] hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            disabled={recordatorios.length === 0}
            className="flex items-center gap-2 rounded-lg bg-[#6aa842] px-4 py-2 text-sm font-bold text-white hover:bg-[#5c9439] disabled:opacity-40 disabled:hover:bg-[#6aa842]"
          >
            <Send size={15} />
            Confirmar envío
          </button>
        </div>
      </div>
    </div>
  );
}
