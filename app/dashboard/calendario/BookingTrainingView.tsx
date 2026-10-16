'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import WorkoutSummary from '../entrenamientos/WorkoutSummary';

// Vista "training": entrenamiento asignado a esta sesión, si tiene uno,
// o el buscador/creador si todavía no. El entrenamiento es un campo más
// del formulario (igual que notas o clientes): se queda en local hasta
// que se pulsa "Guardar" en la vista principal.
export default function BookingTrainingView({
  bookingWorkout,
  removeWorkout,
  pickerOpen,
  setPickerOpen,
  workoutSearch,
  setWorkoutSearch,
  allWorkouts,
  filteredWorkouts,
  attachWorkout,
  setWorkoutFormOpen,
  openWorkoutPicker,
}: {
  bookingWorkout: any | null;
  removeWorkout: () => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  workoutSearch: string;
  setWorkoutSearch: (s: string) => void;
  allWorkouts: any[] | null;
  filteredWorkouts: any[];
  attachWorkout: (workout: any) => void;
  setWorkoutFormOpen: (open: boolean) => void;
  openWorkoutPicker: () => void;
}) {
  const hint = (
    <p className="mb-2 text-xs text-[#868585]">
      Pulsa Guardar para confirmar el entrenamiento, o Atrás para salir sin guardar los cambios.
    </p>
  );

  if (bookingWorkout) {
    return (
      <>
        {hint}
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[#2b2b2a]">{bookingWorkout.name}</h4>
            <div className="flex shrink-0 gap-1.5">
              <Link
                href={`/dashboard/entrenamientos?editWorkout=${bookingWorkout._id}`}
                onClick={(e) => {
                  // Esto sale de toda la página del calendario, no solo de
                  // esta pestaña: cualquier cambio sin guardar en la sesión
                  // (hora, cliente...) se perdería, no solo lo del entrenamiento.
                  if (
                    !window.confirm(
                      'Vas a salir de esta sesión para editar el entrenamiento. Se perderá cualquier cambio sin guardar. ¿Seguro?',
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                title="Editar este entrenamiento en Entrenamientos (afecta a todas las sesiones que lo usen)"
                className="rounded-lg bg-gray-100 p-1.5 text-[#2b2b2a] hover:bg-gray-200"
              >
                <Pencil size={14} />
              </Link>
              <button
                type="button"
                onClick={removeWorkout}
                title="Quitar entrenamiento de esta sesión"
                className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <WorkoutSummary slots={bookingWorkout.slots} />
        </div>
      </>
    );
  }

  if (pickerOpen) {
    return (
      <>
        {hint}
        <div className="mb-3">
          <input
            value={workoutSearch}
            onChange={(e) => setWorkoutSearch(e.target.value)}
            placeholder="Buscar entrenamiento..."
            autoFocus
            className="mb-1.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6aa842] focus:outline-none"
          />
          <div className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-1">
            {allWorkouts === null ? (
              <p className="p-2 text-xs text-gray-400">Cargando...</p>
            ) : filteredWorkouts.length === 0 ? (
              <p className="p-2 text-xs text-gray-400">Sin resultados.</p>
            ) : (
              filteredWorkouts.map((w) => (
                <button
                  key={w._id}
                  type="button"
                  onClick={() => attachWorkout(w)}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#2b2b2a] hover:bg-gray-50"
                >
                  {w.name}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="text-xs font-semibold text-[#868585] hover:underline"
          >
            Cancelar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {hint}
      <div className="mb-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setWorkoutFormOpen(true)}
          className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Crear entrenamiento nuevo
        </button>
        <button
          type="button"
          onClick={openWorkoutPicker}
          className="rounded-lg border border-gray-200 py-2 text-sm font-semibold text-[#868585] hover:bg-gray-50"
        >
          Elegir uno existente
        </button>
      </div>
    </>
  );
}
