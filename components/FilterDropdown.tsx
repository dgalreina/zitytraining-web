'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const ALL_VALUE = 'all';
const FALLBACK_COLOR = '#868585';

// Desplegable genérico reutilizable (filtros del calendario, selector de
// entrenador en el modal de sesión, etc.)
export default function FilterDropdown({
  label,
  options,
  value,
  onChange,
  showColorDot,
}: {
  label: string;
  options: { id: string; name: string; color?: string }[];
  value: string;
  onChange: (id: string) => void;
  showColorDot?: boolean;
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

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative w-full sm:w-56">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#2b2b2a]"
      >
        <span className="flex items-center gap-2 truncate">
          {showColorDot && selected && selected.id !== ALL_VALUE && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color || FALLBACK_COLOR }}
            />
          )}
          <span className="truncate">{selected ? selected.name : label}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-10 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                o.id === value
                  ? 'bg-[#a2c037]/10 font-semibold text-[#4b7a1f]'
                  : 'text-[#2b2b2a] hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {showColorDot && o.id !== ALL_VALUE && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.color || FALLBACK_COLOR }}
                  />
                )}
                <span className="truncate">{o.name}</span>
              </span>
              {o.id === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
