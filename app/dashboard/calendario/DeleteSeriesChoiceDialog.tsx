'use client';

// Preguntado al borrar una sesión que pertenece a una serie: solo esta,
// o esta y todas las futuras. Las sesiones pasadas nunca se borran, se
// decida lo que se decida aquí.
export default function DeleteSeriesChoiceDialog({
  open,
  onClose,
  onDeleteOnly,
  onDeleteSeriesFrom,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onDeleteOnly: () => void;
  onDeleteSeriesFrom: () => void;
  saving: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
          Esta sesión es de una serie
        </h3>
        <p className="mb-5 text-sm text-[#868585]">
          ¿Quieres borrar solo esta sesión, o esta y todas las futuras de la serie? Las sesiones
          pasadas nunca se borran.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onDeleteOnly}
            disabled={saving}
            className="rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-50 disabled:opacity-60"
          >
            Solo esta sesión
          </button>
          <button
            onClick={onDeleteSeriesFrom}
            disabled={saving}
            className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Esta y todas las futuras
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="py-1.5 text-sm font-semibold text-[#868585] hover:underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
