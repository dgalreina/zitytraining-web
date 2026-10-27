import { WorkoutSlot } from './workoutsApi';
import { WeightOverrideSlot } from './bookingsApi';

// Pesos/reps reales de una sesión concreta por encima de la plantilla
// compartida del catálogo: para cada slot, si hay un override para su
// ejercicio se usa ese "sets", si no el de la plantilla. Se empareja por
// exercise._id (no por índice): si la plantilla repite el mismo
// ejercicio en dos slots, ambos comparten override — caso raro, no
// compensa más complejidad.
export function effectiveSlots(
  slots: WorkoutSlot[] | undefined,
  overrides: WeightOverrideSlot[] | undefined,
): WorkoutSlot[] {
  if (!slots) return [];
  if (!overrides || overrides.length === 0) return slots;
  const byExercise = new Map(overrides.map((o) => [o.exercise, o.sets]));
  return slots.map((slot) => {
    const overrideSets = slot.exercise ? byExercise.get(slot.exercise._id) : undefined;
    return overrideSets ? { ...slot, sets: overrideSets } : slot;
  });
}
