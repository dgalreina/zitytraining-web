'use client';

// Preguntado al cambiar (o quitar) el entrenamiento de una sesión que
// pertenece a una serie: solo esta sesión, o esta y todas las futuras ya
// generadas (más la plantilla de la serie, para las que se generen más
// adelante). Las sesiones pasadas nunca se tocan, se decida lo que se
// decida aquí.
export default function WorkoutSeriesChoiceDialog({
  open,
  onCancel,
  onApplyToThisOnly,
  onApplyToSeries,
}: {
  open: boolean;
  onCancel: () => void;
  onApplyToThisOnly: () => void;
  onApplyToSeries: () => void;
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
          ¿Aplicas este entrenamiento solo a esta sesión, o también a las futuras de la serie? Las
          sesiones pasadas nunca se tocan.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onApplyToThisOnly}
            className="rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-50"
          >
            Solo esta sesión
          </button>
          <button
            onClick={onApplyToSeries}
            className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Esta y todas las futuras
          </button>
          <button
            onClick={onCancel}
            className="py-1.5 text-sm font-semibold text-[#868585] hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
