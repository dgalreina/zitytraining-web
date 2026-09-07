'use client';

import { Timer, StickyNote, Link2 } from 'lucide-react';
import { categoryMeta } from './exerciseCategories';
import { computeSlotLabels, groupSlotsForDisplay } from './workoutSlotLabels';

// Vista de solo lectura de los ejercicios de un entrenamiento: icono +
// nombre + etiqueta (1, 1a, 1b...), repeticiones, RP y notas, agrupando
// las superseries con el filo verde. La usan la lista de Entrenamientos,
// la ficha de sesión del calendario y el Dashboard.
export default function WorkoutSummary({ slots }: { slots: any[] }) {
  const labels = computeSlotLabels(slots);
  const blocks = groupSlotsForDisplay(slots);

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const isSuperset = block.length > 1;
        const rows = block.map(({ slot, flatIndex }: { slot: any; flatIndex: number }, si: number) => {
          const Icon = categoryMeta(slot.exercise?.category || 'otros').icon;
          return (
            <div key={flatIndex}>
              <div className="flex min-w-0 flex-col gap-1.5 py-1.5">
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
                {slot.reps?.length > 0 && (
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
          <div key={bi} className="rounded-lg border-l-4 border-[#6aa842] py-1 pl-2 pr-1">
            {rows}
          </div>
        ) : (
          <div key={bi}>{rows}</div>
        );
      })}
    </div>
  );
}
