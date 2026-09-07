'use client';

import { useState } from 'react';
import { X, Check, Link2 } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createWorkout, updateWorkout } from '@/lib/api';
import { Slot, emptySlot } from './ExerciseSlotInput';
import SortableExerciseSlot from './SortableExerciseSlot';
import { computeSlotLabels, groupSlotsForDisplay } from './workoutSlotLabels';

const INITIAL_SLOT_COUNT = 6;

function workoutToSlots(workout: any): Slot[] {
  const loaded: Slot[] = workout.slots.map((s: any) => ({
    key: Math.random().toString(36).slice(2),
    exerciseId: s.exercise?._id || null,
    exerciseName: s.exercise?.name || '',
    reps: (s.reps || []).map((r: number) => String(r)),
    linkedToNext: !!s.linkedToNext,
    restPause: !!s.restPause,
    notes: s.notes || '',
  }));
  loaded.push(emptySlot());
  return loaded;
}

// Formulario de crear/editar entrenamiento, reutilizable: lo usa tanto
// la pestaña "Entrenamientos" como la ficha de sesión del calendario
// (para crear un entrenamiento nuevo directamente para esa sesión).
export default function WorkoutFormModal({
  editingWorkout,
  title,
  onClose,
  onSaved,
}: {
  editingWorkout?: any | null;
  title?: string;
  onClose: () => void;
  onSaved: (workout: any) => void;
}) {
  const [name, setName] = useState(editingWorkout?.name || '');
  const [slots, setSlots] = useState<Slot[]>(() =>
    editingWorkout ? workoutToSlots(editingWorkout) : Array.from({ length: INITIAL_SLOT_COUNT }, emptySlot),
  );
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

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
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return prev;
      const next = prev.filter((s) => s.key !== key);
      // Si el anterior enlazaba con el que se borra, se queda suelto:
      // si no, apuntaria sin querer al que ocupe ahora su sitio.
      if (idx > 0 && prev[idx - 1].linkedToNext) {
        next[idx - 1] = { ...next[idx - 1], linkedToNext: false };
      }
      return next;
    });
  }

  // "SS": enciende el enlace del pulsado con el siguiente y añade un
  // ejercicio vacio justo detras para continuar la cadena (1a, 1b, 1c...).
  function addSupersetAfter(key: string) {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], linkedToNext: true };
      next.splice(idx + 1, 0, emptySlot());
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
          linkedToNext: s.linkedToNext || undefined,
          restPause: s.restPause || undefined,
          notes: s.notes.trim() || undefined,
        })),
      };
      const result = editingWorkout
        ? await updateWorkout(token, editingWorkout._id, payload)
        : await createWorkout(token, payload);
      onSaved(result);
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el entrenamiento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
            {title || (editingWorkout ? 'Editar entrenamiento' : 'Nuevo entrenamiento')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slots.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {(() => {
                  const labels = computeSlotLabels(slots);
                  const blocks = groupSlotsForDisplay(slots);
                  return blocks.map((block, bi) => {
                    const isSuperset = block.length > 1;
                    const items = block.map(({ slot, flatIndex }: { slot: Slot; flatIndex: number }, si: number) => (
                      <div key={slot.key}>
                        <SortableExerciseSlot
                          label={labels[flatIndex]}
                          slot={slot}
                          onChange={(patch) => updateSlot(slot.key, patch)}
                          onRemove={() => removeSlot(slot.key)}
                          onAddSuperset={() => addSupersetAfter(slot.key)}
                          removable={slots.length > 1}
                        />
                        {isSuperset && si < block.length - 1 && (
                          <div className="flex items-center gap-1.5 py-1 pl-3 text-[#6aa842]">
                            <Link2 size={12} className="shrink-0" />
                            <span className="text-[10px] font-semibold uppercase">Superserie</span>
                          </div>
                        )}
                      </div>
                    ));

                    return isSuperset ? (
                      <div key={bi} className="flex flex-col gap-2 rounded-lg border-l-4 border-[#6aa842] pl-2">
                        {items}
                      </div>
                    ) : (
                      <div key={bi}>{items}</div>
                    );
                  });
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
            {saving ? 'Guardando...' : editingWorkout ? 'Guardar cambios' : 'Crear entrenamiento'}
          </button>
        </form>
      </div>
    </div>
  );
}
