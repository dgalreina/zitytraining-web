'use client';

import { useEffect, useState } from 'react';

// Preguntado al borrar una sesión que pertenece a una serie: solo esta,
// o esta y todas las futuras. Las sesiones pasadas nunca se borran, se
// decida lo que se decida aquí. "Se le debe esta clase" solo aplica a
// "solo esta sesión": para "esta y todas las futuras" no tiene mucho
// sentido (son sesiones que ni se habían dado todavía).
export default function DeleteSeriesChoiceDialog({
  open,
  clients,
  onClose,
  onDeleteOnly,
  onDeleteSeriesFrom,
  saving,
}: {
  open: boolean;
  clients: { _id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onDeleteOnly: (addOwed: boolean) => void;
  onDeleteSeriesFrom: () => void;
  saving: boolean;
}) {
  const [addOwed, setAddOwed] = useState(false);

  useEffect(() => {
    if (open) setAddOwed(false);
  }, [open]);

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

        {clients.length > 0 && (
          <label className="mb-4 flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-xs font-semibold text-[#868585]">
              Se le debe esta clase{clients.length > 1 ? ' (a todos)' : ''}
              <span className="block font-normal text-[11px] text-gray-400">Solo si borras "solo esta sesión"</span>
            </span>
            <input
              type="checkbox"
              checked={addOwed}
              onChange={(e) => setAddOwed(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[#6aa842]"
            />
          </label>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onDeleteOnly(addOwed)}
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
