'use client';

// Confirmación genérica con nuestro estilo (mismo molde que
// DeleteSeriesChoiceDialog/WorkoutSeriesChoiceDialog), para no usar
// window.confirm: ese sale con el aspecto nativo del navegador/móvil, que
// no pega con el resto de la app.
export default function ConfirmDialog({
  open,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
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
        <p className="mb-5 text-sm text-[#868585]">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={
              danger
                ? 'rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700'
                : 'rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90'
            }
          >
            {confirmLabel}
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
