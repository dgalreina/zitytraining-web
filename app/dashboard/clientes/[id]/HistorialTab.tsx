'use client';

const FALLBACK_ACTOR_COLOR = '#868585'; // igual que en el calendario, para entrenadores/clientes sin color propio

function actorName(userRef: any, fallback: string) {
  return userRef?.firstName ? `${userRef.firstName} ${userRef.lastName}` : fallback;
}

function actorColor(userRef: any) {
  return userRef?.color || FALLBACK_ACTOR_COLOR;
}

function formatDateTimeShort(date: string | Date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

// Convierte cada compra en 1 o 2 eventos: cuando se contrato y, si
// aplica, cuando/por que acabo (cancelada, cambiada por otra, o
// caducada sola si era un plan puntual). Cada evento lleva fecha,
// concepto (nombre del plan + accion) y autor (con su color, como en
// el calendario) por separado, para pintarlos en columnas.
function buildHistoryEvents(purchases: any[], clientName: string) {
  const events: {
    id: string;
    date: Date;
    itemLabel: string;
    action: string;
    author: string;
    authorColor: string;
  }[] = [];

  for (const p of purchases) {
    const creator = actorName(p.createdBy, p.assignedInPerson ? 'el equipo' : `${clientName} (cliente)`);
    events.push({
      id: `${p._id}-created`,
      date: new Date(p.createdAt),
      itemLabel: p.itemLabel,
      action: 'contratado',
      author: creator,
      authorColor: actorColor(p.createdBy),
    });

    if (p.endedAt) {
      const ender = actorName(p.endedBy, '');
      if (p.endReason === 'changed') {
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: `cambiado a "${p.replacedByLabel}"`,
          author: ender,
          authorColor: actorColor(p.endedBy),
        });
      } else if (p.endReason === 'cancelled') {
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: 'cancelado',
          author: ender,
          authorColor: actorColor(p.endedBy),
        });
      } else if (p.scheduledEndDate) {
        // Plan puntual que llego solo a su fecha de fin, sin que nadie lo parara a mano.
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: 'finalizado (fin de plan puntual)',
          author: '',
          authorColor: FALLBACK_ACTOR_COLOR,
        });
      }
    }
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function HistorialTab({
  purchases,
  clientName,
}: {
  purchases: any[] | null;
  clientName: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6">
      {purchases === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : purchases.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay pagos registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {buildHistoryEvents(purchases, clientName).map((ev) => (
            <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#868585]">{formatDateTimeShort(ev.date)}</span>
                {ev.author && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#868585]">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.authorColor }}
                    />
                    {ev.author}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#2b2b2a]">
                <span className="font-semibold">{ev.itemLabel}</span> {ev.action}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
