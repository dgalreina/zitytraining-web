'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Plus, X, Trash2, GripVertical, Link2, Timer, StickyNote } from 'lucide-react';
import { searchExercises, createExercise } from '@/lib/api';

const DEFAULT_SETS = 4;

export type Slot = {
  key: string;
  exerciseId: string | null;
  exerciseName: string;
  reps: string[];
  supersetGroup?: string;
  restPause: boolean;
  notes: string;
};

export function emptySlot(): Slot {
  return {
    key: Math.random().toString(36).slice(2),
    exerciseId: null,
    exerciseName: '',
    reps: Array.from({ length: DEFAULT_SETS }, () => ''),
    restPause: false,
    notes: '',
  };
}

function toggleButtonClass(active: boolean) {
  return `flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
    active
      ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
      : 'border-gray-200 text-[#868585] hover:bg-gray-50'
  }`;
}

export default function ExerciseSlotInput({
  label,
  slot,
  onChange,
  onRemove,
  onAddSuperset,
  removable,
  dragHandleProps,
}: {
  label: string;
  slot: Slot;
  onChange: (patch: Partial<Slot>) => void;
  onRemove: () => void;
  onAddSuperset: () => void;
  removable: boolean;
  dragHandleProps?: { attributes: Record<string, any>; listeners: Record<string, any> | undefined };
}) {
  const [query, setQuery] = useState(slot.exerciseName);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!slot.notes);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3 letras minimo antes de ir a la base de datos, con un pequeno
  // debounce para no lanzar una llamada por cada tecla.
  useEffect(() => {
    if (slot.exerciseId) return;
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setSearching(true);
    const handle = setTimeout(() => {
      searchExercises(token, query.trim())
        .then((results) => setSuggestions(results))
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, slot.exerciseId]);

  function selectExercise(exercise: any) {
    justSelectedRef.current = true;
    onChange({ exerciseId: exercise._id, exerciseName: exercise.name });
    setQuery(exercise.name);
    setOpen(false);
    setSuggestions([]);
  }

  // No hay boton de "crear ejercicio": si lo escrito no esta en la
  // sugerencia elegida, al salir del campo (o pulsar Enter) se da de
  // alta solo (el backend reutiliza uno existente si el nombre coincide).
  async function resolveTyped() {
    const name = query.trim();
    if (!name) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setResolving(true);
    try {
      const resolved = await createExercise(token, name);
      selectExercise(resolved);
    } catch {
      // El usuario puede reintentar; no hay nada critico que romper aqui.
    } finally {
      setResolving(false);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      resolveTyped();
    }, 150);
  }

  function clearSelection() {
    onChange({ exerciseId: null, exerciseName: '' });
    setQuery('');
    setSuggestions([]);
  }

  function updateRep(i: number, value: string) {
    const next = [...slot.reps];
    next[i] = value;
    onChange({ reps: next });
  }

  function addSet() {
    onChange({ reps: [...slot.reps, ''] });
  }

  function handleToggleNotes() {
    setNotesOpen((open) => {
      const next = !open;
      if (!next) onChange({ notes: '' });
      return next;
    });
  }

  const exactMatch = suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div
      className={`rounded-lg border p-3 ${
        slot.supersetGroup ? 'border-[#6aa842] border-l-4' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center gap-2">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className="shrink-0 touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            style={{ cursor: 'grab' }}
          >
            <GripVertical size={16} />
          </button>
        )}
        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 px-1 text-xs font-bold text-[#868585]">
          {label}
        </span>

        <div ref={containerRef} className="relative flex-1">
          {slot.exerciseId ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-[#a2c037]/10 px-3 py-2">
              <span className="text-sm font-medium text-[#2b2b2a]">{slot.exerciseName}</span>
              <button type="button" onClick={clearSelection} className="text-[#868585] hover:text-[#2b2b2a]">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Search size={14} className="shrink-0 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      resolveTyped();
                    }
                  }}
                  placeholder={resolving ? 'Guardando...' : 'Escribe para buscar un ejercicio...'}
                  disabled={resolving}
                  className="w-full text-sm text-[#2b2b2a] focus:outline-none disabled:text-gray-400"
                />
              </div>

              {open && query.trim().length >= 3 && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  {searching ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectExercise(s);
                        }}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#2b2b2a] hover:bg-gray-50"
                      >
                        {s.name}
                      </button>
                    ))
                  ) : (
                    !exactMatch && (
                      <p className="px-3 py-2 text-xs text-gray-400">
                        Sin resultados: se añadirá &quot;{query.trim()}&quot; como ejercicio nuevo.
                      </p>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {removable && (
          <button type="button" onClick={onRemove} className="shrink-0 text-gray-300 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
        <span className="text-[10px] font-semibold uppercase text-gray-400">Reps</span>
        {slot.reps.map((rep, i) => (
          <input
            key={i}
            type="number"
            min={1}
            value={rep}
            onChange={(e) => updateRep(i, e.target.value)}
            disabled={!slot.exerciseId}
            placeholder={`S${i + 1}`}
            className="w-12 rounded-md border border-gray-200 px-1 py-1 text-center text-xs text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none disabled:bg-gray-50 disabled:text-gray-300"
          />
        ))}
        <button
          type="button"
          onClick={addSet}
          disabled={!slot.exerciseId}
          title="Añadir serie"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-[#6aa842] hover:text-[#4b7a1f] disabled:opacity-40"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
        <button
          type="button"
          onClick={onAddSuperset}
          disabled={!slot.exerciseId}
          title="Añadir ejercicio a la superserie"
          className={`${toggleButtonClass(!!slot.supersetGroup)} disabled:opacity-40`}
        >
          <Link2 size={12} />
          SS
        </button>
        <button
          type="button"
          onClick={() => onChange({ restPause: !slot.restPause })}
          disabled={!slot.exerciseId}
          title="Rest-pause"
          className={`${toggleButtonClass(slot.restPause)} disabled:opacity-40`}
        >
          <Timer size={12} />
          RP
        </button>
        <button
          type="button"
          onClick={handleToggleNotes}
          disabled={!slot.exerciseId}
          title="Notas"
          className={`${toggleButtonClass(notesOpen)} disabled:opacity-40`}
        >
          <StickyNote size={12} />
          Notas
        </button>
      </div>

      {notesOpen && (
        <div className="mt-2 pl-8">
          <input
            value={slot.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Escribe una nota para este ejercicio..."
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
