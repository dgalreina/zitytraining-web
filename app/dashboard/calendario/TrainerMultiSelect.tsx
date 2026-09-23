'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';

// Checklist de entrenadores: de ninguno a todos, no una sola opción
export default function TrainerMultiSelect({
  trainers,
  selectedIds,
  onChange,
}: {
  trainers: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSelected = trainers.length > 0 && selectedIds.length === trainers.length;
  const noneSelected = selectedIds.length === 0;

  function toggleOne(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id],
    );
  }

  let summary = 'Ningún entrenador';
  if (allSelected) summary = 'Todos los entrenadores';
  else if (!noneSelected) {
    const names = trainers
      .filter((t) => selectedIds.includes(t._id))
      .map((t) => t.firstName);
    summary = names.length <= 2 ? names.join(', ') : `${names.length} entrenadores`;
  }

  return (
    <div ref={ref} className="relative w-full sm:w-56">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#2b2b2a]"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1.5 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          <div className="flex gap-1 border-b border-gray-100 px-2 py-1.5">
            <button
              type="button"
              onClick={() => onChange(trainers.map((t) => t._id))}
              className="text-xs font-semibold text-[#4b7a1f] hover:underline"
            >
              Todos
            </button>
            <span className="text-xs text-gray-300">·</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-[#868585] hover:underline"
            >
              Ninguno
            </button>
          </div>
          {trainers.map((t) => {
            const isChecked = selectedIds.includes(t._id);
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => toggleOne(t._id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#2b2b2a] hover:bg-gray-50"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-400 bg-white">
                  {isChecked && <Check size={12} className="text-[#2b2b2a]" strokeWidth={3} />}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color || DEFAULT_TRAINER_COLOR }}
                />
                {t.firstName} {t.lastName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
