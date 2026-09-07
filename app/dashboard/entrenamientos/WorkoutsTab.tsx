'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getWorkouts, createWorkout, deleteWorkout } from '@/lib/api';
import { Slot, emptySlot } from './ExerciseSlotInput';
import SortableExerciseSlot from './SortableExerciseSlot';

const INITIAL_SLOT_COUNT = 6;

export default function WorkoutsTab() {
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Distancia minima antes de considerarlo un arrastre: asi un simple
  // tap en el icono no se confunde con un drag accidental.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlots((prev) => {
      const oldIndex = prev.findIndex((s) => s.key === active.id);
      const newIndex = prev.findIndex((s) => s.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    load(token);
  }, []);

  function load(token: string) {
    getWorkouts(token)
      .then(setWorkouts)
      .catch(() => setError('No se pudieron cargar los entrenamientos'));
  }

  function openCreate() {
    setName('');
    setSlots(Array.from({ length: INITIAL_SLOT_COUNT }, emptySlot));
    setFormError('');
    setModalOpen(true);
  }

  // Sin boton de "añadir ejercicio": en cuanto el ultimo slot de la
  // lista tiene ejercicio elegido, se añade uno vacio detras solo,
  // para que siempre haya uno libre donde seguir escribiendo.
  function updateSlot(key: string, patch: Partial<Slot>) {
    setSlots((prev) => {
      const next = prev.map((s) => (s.key === key ? { ...s, ...patch } : s));
      const last = next[next.length - 1];
      if (last?.exerciseId) next.push(emptySlot());
      return next;
    });
  }

  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Ponle un nombre al entrenamiento');
      return;
    }

    const filled = slots.filter((s) => s.exerciseId);
    if (filled.length === 0) {
      setFormError('Añade al menos un ejercicio');
      return;
    }
    const withoutReps = filled.find((s) => s.reps.map(Number).filter((v) => v > 0).length === 0);
    if (withoutReps) {
      setFormError('Indica las repeticiones de cada ejercicio añadido');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    try {
      await createWorkout(token, {
        name: name.trim(),
        slots: filled.map((s) => ({
          exerciseId: s.exerciseId!,
          reps: s.reps.map(Number).filter((v) => v > 0),
        })),
      });
      load(token);
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el entrenamiento');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteWorkout(token, id);
      load(token);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el entrenamiento');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          Crear entrenamiento
        </button>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

      {workouts === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay entrenamientos creados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <div key={w._id} className="rounded-xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                  {w.name}
                </h3>
                <button
                  onClick={() => setConfirmDeleteId(w._id)}
                  title="Eliminar"
                  className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-col divide-y divide-gray-100">
                {w.slots.map((slot: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-[#2b2b2a]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-[#868585]">
                        {i + 1}
                      </span>
                      {slot.exercise?.name || 'Ejercicio eliminado'}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {slot.reps.map((rep: number, j: number) => (
                        <span
                          key={j}
                          className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#a2c037]/10 px-1.5 text-xs font-semibold text-[#4b7a1f]"
                        >
                          {rep}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Nuevo entrenamiento
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="shrink-0">
                <label className="mb-1 block text-xs font-semibold text-[#868585]">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Tren superior día 1"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={slots.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {slots.map((slot, i) => (
                      <SortableExerciseSlot
                        key={slot.key}
                        index={i}
                        slot={slot}
                        onChange={(patch) => updateSlot(slot.key, patch)}
                        onRemove={() => removeSlot(slot.key)}
                        removable={slots.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {formError && <p className="shrink-0 text-sm font-medium text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={saving}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? 'Guardando...' : 'Crear entrenamiento'}
              </button>
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
                Eliminar entrenamiento
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">Esta acción no se puede deshacer.</p>
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
    </>
  );
}
