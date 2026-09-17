import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface WorkoutExerciseRef {
  _id: string;
  name: string;
  category?: string;
}

// Una serie: repeticiones y peso (kg), cada uno opcional por separado.
export interface WorkoutSet {
  reps?: number;
  weight?: number;
}

export interface WorkoutSlot {
  exercise: WorkoutExerciseRef | null;
  sets: WorkoutSet[];
  linkedToNext?: boolean;
  restPause?: boolean;
  notes?: string;
}

export interface Workout {
  _id: string;
  name: string;
  slots: WorkoutSlot[];
}

export interface WorkoutSlotInput {
  exerciseId: string;
  sets?: WorkoutSet[];
  linkedToNext?: boolean;
  restPause?: boolean;
  notes?: string;
}

export interface WorkoutPayload {
  name: string;
  slots: WorkoutSlotInput[];
}

export async function getWorkouts(token: string): Promise<Workout[]> {
  const res = await apiFetch(`${API_URL}/workouts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createWorkout(token: string, data: WorkoutPayload): Promise<Workout> {
  const res = await apiFetch(`${API_URL}/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateWorkout(token: string, id: string, data: WorkoutPayload): Promise<Workout> {
  const res = await apiFetch(`${API_URL}/workouts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteWorkout(token: string, id: string): Promise<Workout> {
  const res = await apiFetch(`${API_URL}/workouts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
