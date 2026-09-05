'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Ban } from 'lucide-react';
import {
  getPlans,
  getClientPurchases,
  assignPlan,
  assignPunctualPlan,
  changePlan,
  cancelPurchase,
} from '@/lib/api';
import { TRAINING_CATEGORIES } from '@/lib/pricing';

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function purchaseStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    paused: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente de confirmar',
    active: 'Activo',
    paused: 'En pausa',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function PlanTab({
  id,
  purchases,
  onPurchasesChange,
}: {
  id: string;
  purchases: any[] | null;
  onPurchasesChange: (updated: any[]) => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'new' | 'punctual' | 'change'>('new');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getPlans(token)
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  function openAssignPicker(mode: 'new' | 'punctual' | 'change') {
    setAssignMode(mode);
    setSelectedPlan(null);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate('');
    setAssignError('');
    setAssignModalOpen(true);
  }

  function openAssignModal(plan: any) {
    setSelectedPlan(plan);
    setAssignError('');
  }

  async function handleAssignConfirm() {
    if (!selectedPlan) return;
    if (assignMode === 'punctual' && !assignEndDate) {
      setAssignError('Elige la fecha de fin del plan puntual');
      return;
    }
    setAssignSaving(true);
    setAssignError('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const categoryTitle = TRAINING_CATEGORIES.find((c) => c.id === selectedPlan.category)?.title;
      const payload = {
        client: id,
        itemId: selectedPlan._id,
        itemLabel: `${selectedPlan.label} (${categoryTitle})`,
        price: selectedPlan.monthlyPrice,
        startDate: assignStartDate,
      };
      if (assignMode === 'punctual') {
        await assignPunctualPlan(token, { ...payload, endDate: assignEndDate });
      } else if (assignMode === 'change') {
        await changePlan(token, payload);
      } else {
        await assignPlan(token, payload);
      }
      // Un plan puntual (o un cambio de plan) puede afectar a otro plan
      // existente; recargamos del todo en vez de solo anteponer el
      // nuevo, para reflejarlo.
      const refreshed = await getClientPurchases(token, id);
      onPurchasesChange(refreshed);
      setAssignModalOpen(false);
      setSelectedPlan(null);
    } catch (err: any) {
      setAssignError(err.message || 'No se pudo asignar el plan');
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleCancelPlan(purchaseId: string) {
    if (!window.confirm('¿Seguro que quieres parar este plan?')) return;
    setCancellingId(purchaseId);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await cancelPurchase(token, purchaseId);
      // Cancelar un plan puntual retoma el que hubiera pausado, y el
      // registro que vuelve trae el autor sin popular; recargamos del
      // todo en vez de solo sustituir este, para reflejar ambas cosas.
      const refreshed = await getClientPurchases(token, id);
      onPurchasesChange(refreshed);
    } catch (err: any) {
      alert(err.message || 'No se pudo parar el plan');
    } finally {
      setCancellingId(null);
    }
  }

  const activeItems =
    purchases?.filter((p) => p.status === 'active' || p.status === 'paused') || [];
  const endedPlanItems =
    purchases?.filter((p) => p.type === 'plan' && p.status === 'cancelled') || [];
  const hasActivePlan = activeItems.some((p) => p.status === 'active');

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
              Plan
            </h3>
            <div className="flex gap-2">
              {hasActivePlan ? (
                <>
                  <button
                    onClick={() => openAssignPicker('punctual')}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                    title="Plan con fecha de fin, que pausa el actual mientras dura"
                  >
                    Añadir plan puntual
                  </button>
                  <button
                    onClick={() => openAssignPicker('change')}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    title="Sustituye el plan activo por otro, de forma definitiva"
                  >
                    Cambiar plan
                  </button>
                </>
              ) : (
                <button
                  onClick={() => openAssignPicker('new')}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Asignar plan
                </button>
              )}
            </div>
          </div>

          {purchases === null ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : activeItems.length === 0 ? (
            <p className="text-sm text-gray-400">
              Este cliente no tiene ningún plan o servicio activo.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeItems.map((item) => (
                <div key={item._id} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#2b2b2a]">
                      {item.itemLabel}
                    </span>
                    {purchaseStatusBadge(item.status)}
                  </div>
                  <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[#868585]">
                    {item.scheduledEndDate ? 'Puntual' : 'Suscripción'}
                  </span>
                  <p className="text-lg font-bold text-[#4b7a1f]">
                    {item.price}€
                    {item.paymentMode === 'monthly' && (
                      <span className="text-xs font-normal text-[#868585]"> /mes</span>
                    )}
                  </p>
                  {item.sessionCount && (
                    <p className="text-xs text-[#868585]">
                      Bono de {item.sessionCount} sesiones
                    </p>
                  )}
                  {item.activatedAt && (
                    <p className="mt-1 text-xs text-[#868585]">
                      {item.status === 'paused' ? 'Empezó el' : 'Activo desde el'}{' '}
                      {new Date(item.activatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {item.status === 'paused' && (
                    <p className="mt-1 text-xs text-blue-700">
                      En pausa mientras dura un plan puntual. Se retoma solo al acabar.
                    </p>
                  )}
                  {item.scheduledEndDate && (
                    <p className="mt-1 text-xs text-[#868585]">
                      Puntual hasta el{' '}
                      {new Date(item.scheduledEndDate).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {item.assignedInPerson && (
                    <button
                      onClick={() => handleCancelPlan(item._id)}
                      disabled={cancellingId === item._id}
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      <Ban size={13} />
                      {cancellingId === item._id ? 'Parando...' : 'Parar plan'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {endedPlanItems.length > 0 && (
          <div className="rounded-xl bg-white p-6">
            <h3 className="mb-3 font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
              Planes anteriores
            </h3>
            <div className="flex flex-col gap-3">
              {endedPlanItems.map((item) => (
                <div key={item._id} className="rounded-lg border border-gray-100 p-4">
                  <span className="text-sm font-semibold text-[#2b2b2a]">
                    {item.itemLabel}
                  </span>
                  {item.activatedAt && item.endedAt && (
                    <p className="mt-1 text-xs text-[#868585]">
                      Fue del {formatDateTime(item.activatedAt)} al{' '}
                      {formatDateTime(item.endedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setAssignModalOpen(false);
            setSelectedPlan(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {selectedPlan
                  ? assignMode === 'punctual'
                    ? 'Confirmar plan puntual'
                    : assignMode === 'change'
                      ? 'Confirmar cambio de plan'
                      : 'Confirmar plan'
                  : assignMode === 'punctual'
                    ? 'Plan puntual'
                    : assignMode === 'change'
                      ? 'Cambiar plan'
                      : 'Asignar plan'}
              </h3>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
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
                          onClick={() => openAssignModal(plan)}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
                        >
                          <span className="flex items-center gap-1.5 text-[#2b2b2a]">
                            <Clock size={14} className="text-[#4b7a1f]" />
                            {plan.label}
                          </span>
                          <span className="font-bold text-[#4b7a1f]">
                            {plan.monthlyPrice}€<span className="font-normal text-[#868585]">/mes</span>
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
                    {selectedPlan.monthlyPrice}€
                    <span className="text-sm font-normal text-[#868585]"> /mes</span>
                  </p>
                  <p className="mt-1 text-xs text-[#868585]">
                    {assignMode === 'punctual'
                      ? 'Plan puntual: pausa el plan activo actual mientras dura, y lo retoma solo al llegar la fecha de fin.'
                      : assignMode === 'change'
                        ? 'Cambiar plan: sustituye el plan activo actual de forma definitiva, no se retoma.'
                        : 'Suscripción: sigue activa hasta que se pare.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-semibold text-[#868585]">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={assignStartDate}
                      onChange={(e) => setAssignStartDate(e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                    />
                  </div>
                  {assignMode === 'punctual' && (
                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-semibold text-[#868585]">
                        Fecha de fin
                      </label>
                      <input
                        type="date"
                        value={assignEndDate}
                        min={assignStartDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                      />
                    </div>
                  )}
                </div>

                {assignError && (
                  <p className="text-sm font-medium text-red-600">{assignError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAssignConfirm}
                    disabled={assignSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Check size={16} />
                    {assignSaving ? 'Asignando...' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
