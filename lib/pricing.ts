export type TrainingCategory = 'personal' | 'duo' | 'trio';

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

export const REMOTE_SERVICES: RemoteService[] = [
  { id: 'rutina-dieta', label: 'Rutina + dieta', price: 110 },
  { id: 'trimestre', label: 'Trimestre con seguimiento', price: 240 },
  { id: 'rutina', label: 'Rutina de entrenamiento', price: 60 },
  { id: 'dieta', label: 'Dieta', price: 60 },
  { id: 'dieta-rutina-clientes', label: 'Dieta o rutina (clientes)', price: 30 },
  { id: 'primera-dieta', label: 'Primera dieta (clientes)', price: 'free' },
  { id: 'consulta', label: 'Consulta / estudio antropométrico', price: 30 },
];