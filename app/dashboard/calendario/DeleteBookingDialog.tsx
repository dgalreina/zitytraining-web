'use client';

import { useEffect, useState } from 'react';

// Confirmación al borrar una sesión suelta (no de serie, ver
// DeleteSeriesChoiceDialog para esas): además de "¿seguro?", deja marcar
// que se le debe esa clase. Si la sesión es de dúo/trío, se añade a
// TODOS sus clientes: se cancela para todo el grupo, no para uno suelto.
export default function DeleteBookingDialog({
  open,
  clients,
  onCancel,
  onConfirm,
  saving,
}: {
  open: boolean;
  clients: { _id: string; firstName: string; lastName: string }[];
  onCancel: () => void;
  onConfirm: (addOwed: boolean) => void;
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
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-sm text-[#868585]">
          ¿Seguro que quieres eliminar esta sesión? No se puede deshacer.
        </p>

        {clients.length > 0 && (
          <label className="mb-5 flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <span className="text-xs font-semibold text-[#868585]">
              Se le debe esta clase{clients.length > 1 ? ' (a todos)' : ''}
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
            onClick={() => onConfirm(addOwed)}
            disabled={saving}
            className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Eliminando...' : 'Eliminar'}
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
