import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface Exercise {
  _id: string;
  name: string;
  category?: string;
  locked?: boolean;
}

export async function searchExercises(token: string, q: string): Promise<Exercise[]> {
  const res = await apiFetch(`${API_URL}/exercises?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createExercise(token: string, name: string, category?: string): Promise<Exercise> {
  const res = await apiFetch(`${API_URL}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, category }),
  });
  return handleResponse(res);
}

export async function getExercises(token: string): Promise<Exercise[]> {
  const res = await apiFetch(`${API_URL}/exercises`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateExercise(
  token: string,
  id: string,
  name: string,
  category?: string,
): Promise<Exercise> {
  const res = await apiFetch(`${API_URL}/exercises/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, category }),
  });
  return handleResponse(res);
}

export async function deleteExercise(token: string, id: string): Promise<Exercise> {
  const res = await apiFetch(`${API_URL}/exercises/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
