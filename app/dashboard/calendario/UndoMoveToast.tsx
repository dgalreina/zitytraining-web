'use client';

import { useEffect } from 'react';

// Aviso flotante tras mover una sesión arrastrando, con un botón para
// deshacerlo (como hace Google Calendar), en vez de preguntar "¿seguro?"
// antes de mover, que sería un paso de más en un gesto que ya es
// reversible. Se cierra solo pasados unos segundos.
export default function UndoMoveToast({
  message,
  onUndo,
  onDismiss,
  durationMs = 6000,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
      <div className="flex items-center gap-4 rounded-xl bg-[#2b2b2a] py-2.5 pl-4 pr-3 text-sm text-white shadow-xl">
        <span>{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="rounded-lg px-2 py-1 font-semibold text-[#a2c037] hover:bg-white/10"
        >
          Deshacer
        </button>
      </div>
    </div>
  );
}
