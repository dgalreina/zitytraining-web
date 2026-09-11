'use client';

import { Check, X, Clock } from 'lucide-react';
import { TRAINING_CATEGORIES } from '@/lib/pricing';
import { lastDayOfMonth } from '@/lib/dateUtils';

export default function AssignPlanModal({
  mode,
  plans,
  selectedPlan,
  onSelectPlan,
  onBack,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  saving,
  error,
  onConfirm,
  onClose,
}: {
  mode: 'new' | 'punctual' | 'change';
  plans: any[];
  selectedPlan: any | null;
  onSelectPlan: (plan: any) => void;
  onBack: () => void;
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
        className="max-h-[85vh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
            {selectedPlan
              ? mode === 'punctual'
                ? 'Confirmar plan puntual'
                : mode === 'change'
                  ? 'Confirmar cambio de plan'
                  : 'Confirmar plan'
              : mode === 'punctual'
                ? 'Plan puntual'
                : mode === 'change'
                  ? 'Cambiar plan'
                  : 'Asignar plan'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {!selectedPlan ? (
          <div className="flex flex-col gap-6">
            {TRAINING_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h4 className="mb-2 text-sm font-bold text-[#2b2b2a]">{category.title}</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {plans.filter((p) => p.category === category.id).map((plan) => (
                    <button
                      key={plan._id}
                      onClick={() => onSelectPlan(plan)}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
                    >
                      <span className="flex items-center gap-1.5 text-[#2b2b2a]">
                        <Clock size={14} className="text-[#4b7a1f]" />
                        {plan.label}
                      </span>
                      <span className="font-bold text-[#4b7a1f]">
                        {plan.category === 'sesiones_libres' ? (
                          <>
                            {plan.sessionPrice}€<span className="font-normal text-[#868585]">/sesión</span>
                          </>
                        ) : (
                          <>
                            {plan.monthlyPrice}€<span className="font-normal text-[#868585]">/mes</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-[#2b2b2a]">{selectedPlan.label}</p>

            <div className="rounded-lg bg-[#f7f7f5] p-4">
              <p className="text-lg font-bold text-[#4b7a1f]">
                {selectedPlan.category === 'sesiones_libres' ? (
                  <>
                    {selectedPlan.sessionPrice}€
                    <span className="text-sm font-normal text-[#868585]"> /sesión</span>
                  </>
                ) : (
                  <>
                    {selectedPlan.monthlyPrice}€
                    <span className="text-sm font-normal text-[#868585]"> /mes</span>
                  </>
                )}
              </p>
              {selectedPlan.category === 'sesiones_libres' && (
                <p className="mt-1 text-xs text-[#868585]">
                  Hasta {selectedPlan.sessionCount} sesiones al mes; no se sabe de antemano
                  cuántas se van a usar, así que no hay un total fijo.
                </p>
              )}
              <p className="mt-1 text-xs text-[#868585]">
                {mode === 'punctual'
                  ? 'Plan puntual: pausa el plan activo actual mientras dura, y lo retoma solo al llegar la fecha de fin.'
                  : mode === 'change'
                    ? 'Cambiar plan: sustituye el plan activo actual de forma definitiva, no se retoma.'
                    : 'Suscripción: sigue activa hasta que se pare.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-semibold text-[#868585]">
                  Fecha de inicio
                </label>
                {mode !== 'punctual' && selectedPlan.category !== 'sesiones_libres' ? (
                  <>
                    <input
                      type="month"
                      value={startDate.slice(0, 7)}
                      onChange={(e) => onStartDateChange(`${e.target.value}-01`)}
                      className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                    />
                    <p className="mt-1 text-xs text-[#868585]">
                      Los planes mensuales siempre empiezan el día 1.
                    </p>
                  </>
                ) : (
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                  />
                )}
              </div>
              {mode === 'punctual' && (
                <div className="min-w-0">
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
                </div>
              )}
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? 'Asignando...' : 'Confirmar'}
              </button>
              <button
                onClick={onBack}
                className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Atrás
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
