'use client';

import { useEffect, useState } from 'react';
import { X, Trash2, Send, Pencil, Check, PhoneOff, AlertTriangle } from 'lucide-react';
import { getWeekReminders, logReminderSent } from '@/lib/remindersApi';
import { getMe } from '@/lib/usersApi';
import { renderRecordatorio } from '@/lib/reminderTemplate';

interface Sesion {
  start: Date;
  end: Date;
}

export interface Recordatorio {
  clientId: string;
  nombre: string;
  telefono: string | null;
  mensaje: string;
  // Resumen de días/horas de la semana; delata si algo se movió desde el envío.
  huella: string;
}

// Estado de cada uno frente a lo que ya se mandó.
type Estado = 'nuevo' | 'enviado' | 'cambiado';

// wa.me quiere el número internacional y solo dígitos. A los de 9 dígitos
// se les asume prefijo de España; si ya trae uno, se respeta.
export function telefonoWhatsApp(bruto?: string | null): string | null {
  if (!bruto) return null;
  let digitos = bruto.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.length === 9) digitos = `34${digitos}`;
  return digitos.length >= 11 && digitos.length <= 15 ? digitos : null;
}

// Móvil: esquema whatsapp:// (iOS lo abre sin navegar, sin dejar pestañas
// vacías). Escritorio: WhatsApp Web en otra pestaña (puede no haber app instalada).
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

// Un mensaje por cliente (no por sesión): varias sesiones esa semana van
// en el mismo WhatsApp. Solo cuenta lo que imparte quien usa la app (el
// mensaje sale de su WhatsApp); con dos entrenadores, cada uno escribe lo suyo.
export function construirRecordatorios(
  events: any[],
  trainerId: string,
  template?: string,
): Recordatorio[] {
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
        mensaje: renderRecordatorio(template, nombre, ordenadas),
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
  // Vacío hasta saber qué plantilla usar (ver useEffect), para no
  // construir con la de siempre y pisarla si hay una propia en Ajustes.
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  // Huella del último envío por cliente; vacío mientras se consulta.
  const [huellaEnviada, setHuellaEnviada] = useState<Map<string, string>>(new Map());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !weekStart) {
      setRecordatorios(construirRecordatorios(events, trainerId));
      setCargando(false);
      return;
    }
    Promise.all([
      getWeekReminders(token, weekStart).catch(() => []),
      getMe(token).catch(() => null),
    ])
      .then(([logs, me]) => {
        setHuellaEnviada(new Map(logs.map((l) => [l.clientId, l.sessionsFingerprint])));
        setRecordatorios(construirRecordatorios(events, trainerId, me?.defaultReminderMessage));
      })
      .finally(() => setCargando(false));
    // events/trainerId no cambian con el modal abierto (se monta de cero cada vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // WhatsApp solo atiende una conversación a la vez: se va de uno en uno.
  function enviar(r: Recordatorio) {
    if (!r.telefono) return;

    // Se da por enviado al abrir WhatsApp (no hay forma de saber si se
    // pulsó enviar de verdad); para eso está "volver a enviar".
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
    // Sin pestaña en móvil: con window.open, iOS dejaba una en blanco por envío.
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
              {cargando
                ? 'Comprobando a quién ya has avisado...'
                : recordatorios.length === 0
                  ? 'No hay clientes tuyos esta semana'
                  : pendientes === 0
                    ? `Todos avisados · ${conTelefono.length} de esta semana`
                    : `${pendientes} por avisar de ${conTelefono.length} de esta semana`}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cargando ? (
            <p className="py-6 text-center text-sm text-gray-400">Cargando...</p>
          ) : recordatorios.length === 0 ? (
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

        <div className="border-t border-gray-100 p-5">
          <p className="text-xs text-[#868585]">
            Se abre WhatsApp con el mensaje escrito; el envío lo confirmas tú.
          </p>
        </div>
      </div>
    </div>
  );
}
