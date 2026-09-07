'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Timer, StickyNote, Link2 } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getWorkouts, createWorkout, updateWorkout, deleteWorkout } from '@/lib/api';
import { Slot, emptySlot } from './ExerciseSlotInput';
import SortableExerciseSlot from './SortableExerciseSlot';
import { categoryMeta } from './exerciseCategories';
import { computeSlotLabels, groupSlotsForDisplay } from './workoutSlotLabels';

const INITIAL_SLOT_COUNT = 6;

export default function WorkoutsTab() {
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setEditingId(null);
    setName('');
    setSlots(Array.from({ length: INITIAL_SLOT_COUNT }, emptySlot));
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(workout: any) {
    setEditingId(workout._id);
    setName(workout.name);
    const loaded: Slot[] = workout.slots.map((s: any) => ({
      key: Math.random().toString(36).slice(2),
      exerciseId: s.exercise?._id || null,
      exerciseName: s.exercise?.name || '',
      reps: (s.reps || []).map((r: number) => String(r)),
      supersetGroup: s.supersetGroup,
      restPause: !!s.restPause,
      notes: s.notes || '',
    }));
    loaded.push(emptySlot());
    setSlots(loaded);
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
    setSlots((prev) => {
      const next = prev.filter((s) => s.key !== key);
      // Si un grupo se queda con un unico miembro, deja de ser superserie.
      const counts: Record<string, number> = {};
      next.forEach((s) => {
        if (s.supersetGroup) counts[s.supersetGroup] = (counts[s.supersetGroup] || 0) + 1;
      });
      return next.map((s) => (s.supersetGroup && counts[s.supersetGroup] === 1 ? { ...s, supersetGroup: undefined } : s));
    });
  }

  // "SS": añade un ejercicio vacio justo detras, agrupado con el
  // pulsado (comparten supersetGroup) para que se numeren 1a, 1b, 1c...
  function addSupersetAfter(key: string) {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return prev;
      const current = prev[idx];
      const groupId = current.supersetGroup || current.key;
      const next = [...prev];
      next[idx] = { ...current, supersetGroup: groupId };
      next.splice(idx + 1, 0, { ...emptySlot(), supersetGroup: groupId });
      return next;
    });
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

    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slots: filled.map((s) => ({
          exerciseId: s.exerciseId!,
          reps: s.reps.map(Number).filter((v) => v > 0),
          supersetGroup: s.supersetGroup,
          restPause: s.restPause || undefined,
          notes: s.notes.trim() || undefined,
        })),
      };
      if (editingId) {
        await updateWorkout(token, editingId, payload);
      } else {
        await createWorkout(token, payload);
      }
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex shrink-0 justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          Crear entrenamiento
        </button>
      </div>

      {error && <p className="mb-4 shrink-0 text-sm font-medium text-red-600">{error}</p>}

      {workouts === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay entrenamientos creados.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {workouts.map((w) => (
            <div key={w._id} className="rounded-xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                  {w.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(w)}
                    title="Editar"
                    className="rounded-lg bg-gray-100 p-1.5 text-[#2b2b2a] hover:bg-gray-200"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(w._id)}
                    title="Eliminar"
                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {(() => {
                  const labels = computeSlotLabels(w.slots);
                  const blocks = groupSlotsForDisplay(w.slots);
                  return blocks.map((block, bi) => {
                    const isSuperset = block.length > 1;
                    const rows = block.map(({ slot, flatIndex }, si) => {
                      const Icon = categoryMeta(slot.exercise?.category || 'otros').icon;
                      return (
                        <div key={flatIndex}>
                          <div className="flex flex-col gap-1.5 py-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-bold text-[#868585]">
                                {labels[flatIndex]}
                              </span>
                              <Icon size={16} className="shrink-0" />
                              <span className="text-sm font-medium text-[#2b2b2a]">
                                {slot.exercise?.name || 'Ejercicio eliminado'}
                              </span>
                              {slot.restPause && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  <Timer size={10} />
                                  RP
                                </span>
                              )}
                            </div>
                            {slot.reps.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-13">
                                {slot.reps.map((rep: number, j: number) => (
                                  <span
                                    key={j}
                                    className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#a2c037]/10 px-1.5 text-xs font-semibold text-[#4b7a1f]"
                                  >
                                    {rep}
                                  </span>
                                ))}
                              </div>
                            )}
                            {slot.notes && (
                              <div className="flex min-w-0 items-start gap-1.5 pl-13 text-xs text-[#868585]">
                                <StickyNote size={12} className="mt-0.5 shrink-0" />
                                <span className="min-w-0 wrap-break-word">{slot.notes}</span>
                              </div>
                            )}
                          </div>
                          {isSuperset && si < block.length - 1 && (
                            <div className="flex items-center gap-1.5 pl-3 text-[#6aa842]">
                              <Link2 size={12} className="shrink-0" />
                              <span className="text-[10px] font-semibold uppercase">Superserie</span>
                            </div>
                          )}
                        </div>
                      );
                    });

                    return isSuperset ? (
                      <div
                        key={bi}
                        className="rounded-lg border-l-4 border-[#6aa842] py-1 pl-2 pr-1"
                      >
                        {rows}
                      </div>
                    ) : (
                      <div key={bi}>{rows}</div>
                    );
                  });
                })()}
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
                {editingId ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
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
                    {(() => {
                      const labels = computeSlotLabels(slots);
                      return slots.map((slot, i) => (
                        <SortableExerciseSlot
                          key={slot.key}
                          label={labels[i]}
                          slot={slot}
                          onChange={(patch) => updateSlot(slot.key, patch)}
                          onRemove={() => removeSlot(slot.key)}
                          onAddSuperset={() => addSupersetAfter(slot.key)}
                          removable={slots.length > 1}
                        />
                      ));
                    })()}
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
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear entrenamiento'}
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
    </div>
  );
}
