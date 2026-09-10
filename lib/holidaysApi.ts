import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  origin: 'openholidays' | 'manual';
}

export interface CreateHolidayPayload {
  date: string;
  name: string;
}

export async function getHolidays(token: string, year: number): Promise<Holiday[]> {
  const res = await apiFetch(`${API_URL}/holidays?year=${year}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createHoliday(token: string, data: CreateHolidayPayload): Promise<Holiday> {
  const res = await apiFetch(`${API_URL}/holidays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function resyncHolidays(token: string, year: number): Promise<Holiday[]> {
  const res = await apiFetch(`${API_URL}/holidays/resync?year=${year}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function deleteHoliday(token: string, id: string): Promise<Holiday> {
  const res = await apiFetch(`${API_URL}/holidays/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
