import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface ProgressEntry {
  _id: string;
  client: string;
  date: string;
  weight?: number;
  bodyFatPercent?: number;
  water?: number;
  muscleMass?: number;
  visceralFat?: number;
  boneMass?: number;
}

export interface CreateProgressEntryPayload {
  client: string;
  date: string;
  weight?: number;
  bodyFatPercent?: number;
  water?: number;
  muscleMass?: number;
  visceralFat?: number;
  boneMass?: number;
}

export async function createProgressEntry(
  token: string,
  data: CreateProgressEntryPayload,
): Promise<ProgressEntry> {
  const res = await apiFetch(`${API_URL}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getProgressByClient(token: string, clientId: string): Promise<ProgressEntry[]> {
  const res = await apiFetch(`${API_URL}/progress/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
