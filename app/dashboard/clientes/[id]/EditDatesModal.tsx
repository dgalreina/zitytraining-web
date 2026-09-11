'use client';

import { Check, X } from 'lucide-react';

// La compra no guarda su categoría, pero el itemLabel de "Sesiones
// libres" lo pone siempre el backend (plans.service.ts).
function isFreeSessionsPurchase(item: any) {
  return typeof item.itemLabel === 'string' && item.itemLabel.startsWith('Sesiones libres');
}

// Primer mes posterior a `monthStr` ('yyyy-MM').
function nextMonth(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function EditDatesModal({
  item,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  saving,
  error,
  onConfirm,
  onClose,
}: {
  item: any;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  saving: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
            Editar fechas
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm font-semibold text-[#2b2b2a]">{item.itemLabel}</p>

        <div className="mb-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#868585]">
              Fecha de inicio
            </label>
            {!isFreeSessionsPurchase(item) ? (
              <input
                type="month"
                value={startDate.slice(0, 7)}
                onChange={(e) => onStartDateChange(`${e.target.value}-01`)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
              />
            ) : (
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
              />
            )}
            {item.pausedPlan && (
              <p className="mt-1 text-xs text-[#868585]">
                Esta fecha es solo informativa: el otro plan ya se pausó en el momento de
                asignar este, no se mueve al cambiarla.
              </p>
            )}
          </div>
          {item.scheduledEndDate && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#868585]">
                Fecha de fin
              </label>
              {!isFreeSessionsPurchase(item) ? (
                <input
                  type="month"
                  value={endDate.slice(0, 7)}
                  min={nextMonth(startDate.slice(0, 7))}
                  onChange={(e) => onEndDateChange(`${e.target.value}-01`)}
                  className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
              ) : (
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
              )}
              {item.pausedPlan && (
                <p className="mt-1 text-xs text-[#868585]">
                  El plan en pausa se retoma automáticamente en esta fecha.
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Check size={16} />
          {saving ? 'Guardando...' : 'Guardar fechas'}
        </button>
      </div>
    </div>
  );
}
