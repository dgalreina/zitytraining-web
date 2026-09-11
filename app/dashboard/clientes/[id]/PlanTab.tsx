'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Pencil } from 'lucide-react';
import { getPlans } from '@/lib/plansApi';
import {
  getClientPurchases,
  assignPlan,
  assignPunctualPlan,
  changePlan,
  cancelPurchase,
  updatePurchaseDates,
} from '@/lib/purchasesApi';
import { TRAINING_CATEGORIES } from '@/lib/pricing';
import AssignPlanModal from './AssignPlanModal';
import EditDatesModal from './EditDatesModal';

// La compra no guarda su categoría, pero el itemLabel de "Sesiones
// libres" lo pone siempre el backend (plans.service.ts), así que sirve
// para distinguirlas y no mostrarles un total al mes que no existe.
function isFreeSessionsPurchase(item: any) {
  return typeof item.itemLabel === 'string' && item.itemLabel.startsWith('Sesiones libres');
}

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
  const [editDatesItem, setEditDatesItem] = useState<any | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
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
      // El label de "Sesiones libres" ya dice de qué va (no es un número
      // de sesiones/semana ambiguo como el resto), así que ahí no hace
      // falta repetir la categoría entre paréntesis.
      const categoryTitle = TRAINING_CATEGORIES.find((c) => c.id === selectedPlan.category)?.title;
      const itemLabel =
        selectedPlan.category === 'sesiones_libres'
          ? selectedPlan.label
          : `${selectedPlan.label} (${categoryTitle})`;
      const payload = {
        client: id,
        itemId: selectedPlan._id,
        itemLabel,
        price: selectedPlan.monthlyPrice,
        sessionCount: selectedPlan.sessionCount,
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

  function openEditDates(item: any) {
    setEditDatesItem(item);
    setEditStartDate(item.activatedAt ? item.activatedAt.split('T')[0] : '');
    setEditEndDate(item.scheduledEndDate ? item.scheduledEndDate.split('T')[0] : '');
    setEditError('');
  }

  async function handleEditDatesConfirm() {
    if (!editDatesItem) return;
    if (!editStartDate) {
      setEditError('Elige la fecha de inicio');
      return;
    }
    // Solo los puntuales tienen fecha de fin; si este plan no la tiene, no
    // se manda (no vale la pena convertir una suscripción en puntual desde
    // aquí, solo corregir fechas que ya existían).
    if (editDatesItem.scheduledEndDate && !editEndDate) {
      setEditError('Elige la fecha de fin');
      return;
    }
    setEditSaving(true);
    setEditError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await updatePurchaseDates(token, editDatesItem._id, {
        startDate: editStartDate,
        endDate: editDatesItem.scheduledEndDate ? editEndDate : undefined,
      });
      const refreshed = await getClientPurchases(token, id);
      onPurchasesChange(refreshed);
      setEditDatesItem(null);
    } catch (err: any) {
      setEditError(err.message || 'No se pudieron guardar las fechas');
    } finally {
      setEditSaving(false);
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
                  {isFreeSessionsPurchase(item) && item.sessionCount ? (
                    <>
                      <p className="text-lg font-bold text-[#4b7a1f]">
                        {Math.round((item.price / item.sessionCount) * 100) / 100}€
                        <span className="text-xs font-normal text-[#868585]"> /sesión</span>
                      </p>
                      <p className="text-xs text-[#868585]">
                        Hasta {item.sessionCount} sesiones al mes
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
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
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openEditDates(item)}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                      >
                        <Pencil size={13} />
                        Editar fechas
                      </button>
                      <button
                        onClick={() => handleCancelPlan(item._id)}
                        disabled={cancellingId === item._id}
                        className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                      >
                        <Ban size={13} />
                        {cancellingId === item._id ? 'Parando...' : 'Parar plan'}
                      </button>
                    </div>
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
        <AssignPlanModal
          mode={assignMode}
          plans={plans}
          selectedPlan={selectedPlan}
          onSelectPlan={openAssignModal}
          onBack={() => setSelectedPlan(null)}
          startDate={assignStartDate}
          onStartDateChange={setAssignStartDate}
          endDate={assignEndDate}
          onEndDateChange={setAssignEndDate}
          saving={assignSaving}
          error={assignError}
          onConfirm={handleAssignConfirm}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}

      {editDatesItem && (
        <EditDatesModal
          item={editDatesItem}
          startDate={editStartDate}
          onStartDateChange={setEditStartDate}
          endDate={editEndDate}
          onEndDateChange={setEditEndDate}
          saving={editSaving}
          error={editError}
          onConfirm={handleEditDatesConfirm}
          onClose={() => setEditDatesItem(null)}
        />
      )}
    </>
  );
}
