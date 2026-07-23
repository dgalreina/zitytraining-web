export type TrainingCategory = 'personal' | 'duo' | 'trio';

export interface TrainingPlan {
  id: string;
  category: TrainingCategory;
  label: string; // ej. "2 días/sem · 1h"
  monthlyPrice: number;
  sessionPrice: number;
  sessionCount: number;
  featured?: boolean;
}

export interface RemoteService {
  id: string;
  label: string;
  price: number | 'free';
}

export const TRAINING_CATEGORIES: { id: TrainingCategory; title: string; description: string }[] = [
  {
    id: 'personal',
    title: 'Entrenamiento personal',
    description: 'Entrenamiento individual, solo tú y tu entrenador.',
  },
  {
    id: 'duo',
    title: 'Entrenamiento dúo',
    description: 'Entrena junto a otra persona, mismo horario y entrenador.',
  },
  {
    id: 'trio',
    title: 'Entrenamiento trío',
    description: 'Entrena en grupo de tres, mismo horario y entrenador.',
  },
];

export const TRAINING_PLANS: TrainingPlan[] = [
  { id: 'personal-2-1h', category: 'personal', label: "2 días/sem · 1h", monthlyPrice: 288, sessionPrice: 36, sessionCount: 8 },
  { id: 'personal-2-40', category: 'personal', label: "2 días/sem · 40'", monthlyPrice: 224, sessionPrice: 28, sessionCount: 8 },
  { id: 'personal-3-1h', category: 'personal', label: "3 días/sem · 1h", monthlyPrice: 408, sessionPrice: 34, sessionCount: 12 },
  { id: 'personal-3-40', category: 'personal', label: "3 días/sem · 40'", monthlyPrice: 300, sessionPrice: 25, sessionCount: 12, featured: true },
  { id: 'personal-4-40', category: 'personal', label: "4 días/sem · 40'", monthlyPrice: 384, sessionPrice: 24, sessionCount: 16 },

  { id: 'duo-2-1h', category: 'duo', label: "2 días/sem · 1h", monthlyPrice: 216, sessionPrice: 27, sessionCount: 8 },
  { id: 'duo-2-40', category: 'duo', label: "2 días/sem · 40'", monthlyPrice: 168, sessionPrice: 21, sessionCount: 8 },
  { id: 'duo-3-1h', category: 'duo', label: "3 días/sem · 1h", monthlyPrice: 306, sessionPrice: 25.5, sessionCount: 12 },
  { id: 'duo-3-40', category: 'duo', label: "3 días/sem · 40'", monthlyPrice: 222, sessionPrice: 18.5, sessionCount: 12, featured: true },
  { id: 'duo-4-40', category: 'duo', label: "4 días/sem · 40'", monthlyPrice: 296, sessionPrice: 18.5, sessionCount: 16 },

  { id: 'trio-2-1h', category: 'trio', label: "2 días/sem · 1h", monthlyPrice: 168, sessionPrice: 21, sessionCount: 8 },
  { id: 'trio-2-40', category: 'trio', label: "2 días/sem · 40'", monthlyPrice: 132, sessionPrice: 16.5, sessionCount: 8 },
  { id: 'trio-3-1h', category: 'trio', label: "3 días/sem · 1h", monthlyPrice: 246, sessionPrice: 20.5, sessionCount: 12 },
  { id: 'trio-3-40', category: 'trio', label: "3 días/sem · 40'", monthlyPrice: 180, sessionPrice: 15, sessionCount: 12, featured: true },
  { id: 'trio-4-40', category: 'trio', label: "4 días/sem · 40'", monthlyPrice: 240, sessionPrice: 15, sessionCount: 16 },
];

export const REMOTE_SERVICES: RemoteService[] = [
  { id: 'rutina-dieta', label: 'Rutina + dieta', price: 110 },
  { id: 'trimestre', label: 'Trimestre con seguimiento', price: 240 },
  { id: 'rutina', label: 'Rutina de entrenamiento', price: 60 },
  { id: 'dieta', label: 'Dieta', price: 60 },
  { id: 'dieta-rutina-clientes', label: 'Dieta o rutina (clientes)', price: 30 },
  { id: 'primera-dieta', label: 'Primera dieta (clientes)', price: 'free' },
  { id: 'consulta', label: 'Consulta / estudio antropométrico', price: 30 },
];