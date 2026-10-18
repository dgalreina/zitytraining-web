'use client';

// Preguntado al arrastrar a otro día/hora una sesión que pertenece a una
// serie: solo esta, o esta y todas las futuras ya generadas (más la
// plantilla de la serie, para las que se generen más adelante). Las
// sesiones pasadas nunca se tocan, se decida lo que se decida aquí.
// Cancelar deshace el arrastre (FullCalendar ya la había movido en
// pantalla antes de preguntar).
export default function MoveSeriesChoiceDialog({
  open,
  onCancel,
  onMoveOnly,
  onMoveSeries,
  saving,
}: {
  open: boolean;
  onCancel: () => void;
  onMoveOnly: () => void;
  onMoveSeries: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
          Esta sesión es de una serie
        </h3>
        <p className="mb-5 text-sm text-[#868585]">
          ¿Mueves solo esta sesión a este día/hora, o también las futuras de la serie? Las sesiones
          pasadas nunca se tocan.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onMoveOnly}
            disabled={saving}
            className="rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-50 disabled:opacity-60"
          >
            Solo esta sesión
          </button>
          <button
            onClick={onMoveSeries}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Esta y todas las futuras'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="py-1.5 text-sm font-semibold text-[#868585] hover:underline disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
