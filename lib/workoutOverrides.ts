import { WorkoutSlot } from './workoutsApi';
import { WeightOverrideSlot } from './bookingsApi';

// Para cada slot, usa el override de su ejercicio si hay uno, si no el de
// la plantilla. Empareja por exercise._id, no por índice: si la plantilla
// repite el mismo ejercicio en dos slots, comparten override (caso raro).
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
