'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/api';
import { TRAINING_CATEGORIES, TrainingCategory } from '@/lib/pricing';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

const emptyForm = {
  category: 'personal' as TrainingCategory,
  sessionsPerWeek: '',
  durationMinutes: '',
  monthlyPrice: '',
};

// Igual que en el backend (plans.service.ts): la vista previa del
// precio por sesión y las sesiones/mes se calcula igual, para que se
// vea antes de guardar.
function computePreview(sessionsPerWeek: string, monthlyPrice: string) {
  const weeks = Number(sessionsPerWeek);
  const price = Number(monthlyPrice);
  if (!weeks || isNaN(price)) return null;
  const sessionCount = weeks * 4;
  const sessionPrice = Math.round((price / sessionCount) * 100) / 100;
  return { sessionCount, sessionPrice };
}

export default function GestorPlanesPage() {
  const [plans, setPlans] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router]);

  function load(token: string) {
    getPlans(token)
      .then(setPlans)
      .catch(() => setError('No se pudieron cargar los planes'));
  }

  function openCreate(category: TrainingCategory) {
    setEditingId(null);
    setForm({ ...emptyForm, category });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(plan: any) {
    setEditingId(plan._id);
    setForm({
      category: plan.category,
      sessionsPerWeek: String(plan.sessionsPerWeek),
      durationMinutes: String(plan.durationMinutes),
      monthlyPrice: String(plan.monthlyPrice),
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = {
      category: form.category,
      sessionsPerWeek: Number(form.sessionsPerWeek),
      durationMinutes: Number(form.durationMinutes),
      monthlyPrice: Number(form.monthlyPrice),
    };

    if (
      isNaN(payload.sessionsPerWeek) || payload.sessionsPerWeek < 1 ||
      isNaN(payload.durationMinutes) || payload.durationMinutes < 1 ||
      isNaN(payload.monthlyPrice) || payload.monthlyPrice < 0
    ) {
      setFormError('Revisa las sesiones/semana, los minutos y el precio mensual');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePlan(token, editingId, payload);
      } else {
        await createPlan(token, payload);
      }
      load(token);
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el plan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      await deletePlan(token, id);
      load(token);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el plan');
    } finally {
      setDeletingId(null);
    }
  }

  const plansByCategory = (categoryId: TrainingCategory) =>
    (plans || []).filter((p) => p.category === categoryId);

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Planes
        </h2>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

      {plans === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          {TRAINING_CATEGORIES.map((category) => (
            <div key={category.id} className="rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                    {category.title}
                  </h3>
                  <p className="text-xs text-[#868585]">{category.description}</p>
                </div>
                <button
                  onClick={() => openCreate(category.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Plus size={14} />
                  Nuevo plan
                </button>
              </div>

              {plansByCategory(category.id).length === 0 ? (
                <p className="text-sm text-gray-400">Todavía no hay planes en esta categoría.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {plansByCategory(category.id).map((plan) => (
                    <div
                      key={plan._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[#2b2b2a]">{plan.label}</span>
                        <p className="text-xs text-[#868585]">
                          {plan.monthlyPrice}€/mes · {plan.sessionPrice}€/sesión · bono de{' '}
                          {plan.sessionCount} sesiones
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(plan)}
                          title="Editar"
                          className="rounded-lg bg-gray-100 p-1.5 text-[#2b2b2a] hover:bg-gray-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(plan._id)}
                          title="Eliminar"
                          className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {editingId ? 'Editar plan' : 'Nuevo plan'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: c.id })}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        form.category === c.id
                          ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                          : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sesiones/semana</label>
                  <input
                    type="number"
                    min={1}
                    value={form.sessionsPerWeek}
                    onChange={(e) => setForm({ ...form, sessionsPerWeek: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Minutos por sesión</label>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Precio mensual (€)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.monthlyPrice}
                  onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                  className={inputClass}
                />
              </div>

              {(() => {
                const preview = computePreview(form.sessionsPerWeek, form.monthlyPrice);
                return preview ? (
                  <p className="text-xs text-[#868585]">
                    {preview.sessionPrice}€/sesión · {preview.sessionCount} sesiones/mes
                  </p>
                ) : null;
              })()}

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Check size={16} />
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Eliminar plan
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">
              Deja de estar disponible para asignar o contratar. Los clientes que ya lo tengan no
              se ven afectados: su plan guarda su propio nombre y precio.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === confirmDeleteId ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
