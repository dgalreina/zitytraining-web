'use client';

import { useEffect, useState } from 'react';
import { X, Trash2, Send, Pencil, Check, PhoneOff, AlertTriangle } from 'lucide-react';
import { getWeekReminders, logReminderSent } from '@/lib/remindersApi';

interface Sesion {
  start: Date;
  end: Date;
}

export interface Recordatorio {
  clientId: string;
  nombre: string;
  telefono: string | null;
  mensaje: string;
  // Resumen de sus días y horas de esa semana. Se guarda al enviar, y al
  // volver a abrir delata si algo se ha movido desde entonces.
  huella: string;
}

// Estado de cada uno frente a lo que ya se mandó.
type Estado = 'nuevo' | 'enviado' | 'cambiado';

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

// wa.me quiere el numero en internacional y solo digitos. Los telefonos se
// guardan como los escriba quien da de alta, asi que hay que limpiarlos. A
// los de nueve digitos se les asume prefijo de Espana; si viene con prefijo
// se respeta el que traiga.
export function telefonoWhatsApp(bruto?: string | null): string | null {
  if (!bruto) return null;
  let digitos = bruto.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.length === 9) digitos = `34${digitos}`;
  return digitos.length >= 11 && digitos.length <= 15 ? digitos : null;
}

// En el móvil se llama a la app por su propio esquema: iOS la abre sin
// navegar, así que esta página se queda tal cual y no deja pestañas
// vacías detrás. En escritorio no hay esquema que valga (puede no haber
// WhatsApp instalado), así que se abre WhatsApp Web en otra pestaña.
export function enlaceWhatsApp(
  telefono: string,
  mensaje: string,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
) {
  const texto = encodeURIComponent(mensaje);
  const esMovil = /iPhone|iPad|iPod|Android/i.test(userAgent);
  return esMovil
    ? { url: `whatsapp://send?phone=${telefono}&text=${texto}`, nuevaPestana: false }
    : { url: `https://wa.me/${telefono}?text=${texto}`, nuevaPestana: true };
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
//
// Solo cuentan las sesiones que imparte quien está usando la app, aunque
// el calendario tenga más entrenadores marcados: el mensaje sale de su
// propio WhatsApp, y sería raro que a un cliente le escriba un entrenador
// que no es el suyo. A quien entrene esa semana con dos entrenadores le
// escribe cada uno lo suyo.
export function construirRecordatorios(events: any[], trainerId: string): Recordatorio[] {
  const porCliente = new Map<
    string,
    { nombre: string; telefono: string | null; sesiones: Sesion[] }
  >();

  for (const evento of events) {
    const reserva = evento?.extendedProps?.raw;
    if (!reserva || reserva.isPrivate) continue;
    const suEntrenador = reserva.trainer?._id || reserva.trainer;
    if (!trainerId || String(suEntrenador) !== trainerId) continue;

    for (const cliente of reserva.clients || []) {
      const id = typeof cliente === 'string' ? cliente : cliente._id;
      if (!id) continue;
      const actual = porCliente.get(id) || {
        nombre: cliente.firstName || 'cliente',
        telefono: telefonoWhatsApp(cliente.phone),
        sesiones: [] as Sesion[],
      };
      actual.sesiones.push({
        start: new Date(reserva.startTime),
        end: new Date(reserva.endTime),
      });
      porCliente.set(id, actual);
    }
  }

  return Array.from(porCliente.entries())
    .map(([clientId, { nombre, telefono, sesiones }]) => {
      const ordenadas = [...sesiones].sort((a, b) => a.start.getTime() - b.start.getTime());
      return {
        clientId,
        nombre,
        telefono,
        mensaje: redactar(nombre, ordenadas),
        huella: ordenadas.map((s) => `${s.start.toISOString()}/${s.end.toISOString()}`).join(','),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export default function WhatsAppRemindersModal({
  events,
  trainerId,
  weekStart,
  onClose,
}: {
  events: any[];
  trainerId: string;
  weekStart: string;
  onClose: () => void;
}) {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(() =>
    construirRecordatorios(events, trainerId),
  );
  const [editando, setEditando] = useState<string | null>(null);
  // Huella con la que se le escribió por última vez, por cliente. Vacío
  // mientras se consulta: hasta saberlo, nadie sale marcado.
  const [huellaEnviada, setHuellaEnviada] = useState<Map<string, string>>(new Map());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !weekStart) {
      setCargando(false);
      return;
    }
    getWeekReminders(token, weekStart)
      .then((logs) => setHuellaEnviada(new Map(logs.map((l) => [l.clientId, l.sessionsFingerprint]))))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [weekStart]);

  function estadoDe(r: Recordatorio): Estado {
    const anterior = huellaEnviada.get(r.clientId);
    if (anterior === undefined) return 'nuevo';
    return anterior === r.huella ? 'enviado' : 'cambiado';
  }

  const conTelefono = recordatorios.filter((r) => r.telefono);
  const pendientes = conTelefono.filter((r) => estadoDe(r) !== 'enviado').length;
  const sinTelefono = recordatorios.length - conTelefono.length;

  function editar(clientId: string, mensaje: string) {
    setRecordatorios((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, mensaje } : r)),
    );
  }

  function quitar(clientId: string) {
    setRecordatorios((prev) => prev.filter((r) => r.clientId !== clientId));
    if (editando === clientId) setEditando(null);
  }

  // WhatsApp solo atiende una conversación a la vez, así que no se pueden
  // abrir todas de golpe: se va de uno en uno y se marca lo ya mandado
  // para saber por dónde ibas al volver.
  function enviar(r: Recordatorio) {
    if (!r.telefono) return;

    // Se da por enviado en cuanto se abre WhatsApp. No hay forma de saber
    // si luego se pulsó enviar de verdad, pero para eso está el "volver a
    // enviar".
    setHuellaEnviada((prev) => new Map(prev).set(r.clientId, r.huella));
    const token = localStorage.getItem('token');
    if (token && weekStart) {
      logReminderSent(token, {
        client: r.clientId,
        weekStart,
        sessionsFingerprint: r.huella,
      }).catch(() => {});
    }

    const { url, nuevaPestana } = enlaceWhatsApp(r.telefono, r.mensaje);
    if (nuevaPestana) window.open(url, '_blank');
    // En el móvil NO se abre pestaña: el esquema whatsapp:// lanza la app
    // y deja esta página intacta. Con window.open, iOS se quedaba con una
    // pestaña en blanco por cada mensaje enviado.
    else window.location.href = url;
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
                ? 'No hay clientes tuyos esta semana'
                : cargando
                  ? 'Comprobando a quién ya has avisado...'
                  : pendientes === 0
                    ? `Todos avisados · ${conTelefono.length} de esta semana`
                    : `${pendientes} por avisar de ${conTelefono.length} · tus sesiones de esta semana`}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {recordatorios.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No tienes sesiones con clientes esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sinTelefono > 0 && (
                <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  {sinTelefono === 1
                    ? 'Hay 1 cliente sin teléfono válido: no se le puede escribir.'
                    : `Hay ${sinTelefono} clientes sin teléfono válido: no se les puede escribir.`}
                </p>
              )}

              {recordatorios.map((r) => {
                const estado = estadoDe(r);
                return (
                  <div
                    key={r.clientId}
                    className={`rounded-xl border p-3 ${
                      estado === 'enviado'
                        ? 'border-[#a2c037]/40 bg-[#a2c037]/5'
                        : estado === 'cambiado'
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-100'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-[#2b2b2a]">
                        {r.nombre}
                        {estado === 'enviado' && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#a2c037]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#4b7a1f]">
                            <Check size={10} strokeWidth={3} />
                            Enviado
                          </span>
                        )}
                        {estado === 'cambiado' && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle size={10} />
                            Cambió
                          </span>
                        )}
                        {!r.telefono && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <PhoneOff size={10} />
                            Sin teléfono
                          </span>
                        )}
                      </p>
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

                    <button
                      onClick={() => enviar(r)}
                      disabled={!r.telefono}
                      className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold disabled:opacity-40 ${
                        estado === 'enviado'
                          ? 'bg-white text-[#4b7a1f] ring-1 ring-[#a2c037]/50 hover:bg-[#a2c037]/10'
                          : 'bg-[#6aa842] text-white hover:bg-[#5c9439]'
                      }`}
                    >
                      <Send size={14} />
                      {estado === 'enviado'
                        ? 'Volver a enviar'
                        : estado === 'cambiado'
                          ? 'Avisar del cambio'
                          : 'Enviar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-5">
          <p className="text-xs text-[#868585]">
            Se abre WhatsApp con el mensaje escrito; el envío lo confirmas tú.
          </p>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-[#868585] hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
