import {
  ChestIcon,
  BackIcon,
  ShouldersIcon,
  BicepsIcon,
  TricepsIcon,
  LegsIcon,
  CoreIcon,
  ForearmIcon,
  CardioIcon,
  OlympicIcon,
  GeneralIcon,
} from './muscleIcons';

export const EXERCISE_CATEGORIES = [
  { id: 'pecho', label: 'Pecho', icon: ChestIcon },
  { id: 'espalda', label: 'Espalda', icon: BackIcon },
  { id: 'hombros', label: 'Hombros', icon: ShouldersIcon },
  { id: 'biceps', label: 'Bíceps', icon: BicepsIcon },
  { id: 'triceps', label: 'Tríceps', icon: TricepsIcon },
  { id: 'piernas', label: 'Piernas', icon: LegsIcon },
  { id: 'core', label: 'Core / abdomen', icon: CoreIcon },
  { id: 'antebrazo', label: 'Antebrazo', icon: ForearmIcon },
  { id: 'funcional', label: 'Funcional / cardio', icon: CardioIcon },
  { id: 'olimpicos', label: 'Olímpicos', icon: OlympicIcon },
  { id: 'otros', label: 'Otros', icon: GeneralIcon },
] as const;

export type ExerciseCategoryId = (typeof EXERCISE_CATEGORIES)[number]['id'];

export function categoryMeta(id: string) {
  return EXERCISE_CATEGORIES.find((c) => c.id === id) || EXERCISE_CATEGORIES[EXERCISE_CATEGORIES.length - 1];
}
