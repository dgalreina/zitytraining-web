'use client';

import { Check, X } from 'lucide-react';
import { lastDayOfMonth } from '@/lib/dateUtils';

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
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
            />
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
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={lastDayOfMonth(startDate)}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
              />
              <p className="mt-1 text-xs text-[#868585]">
                No puede cruzar de mes: si hace falta más tiempo, se hace en tramos.
              </p>
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
