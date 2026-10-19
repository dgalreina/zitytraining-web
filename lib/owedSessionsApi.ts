import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface OwedSession {
  _id: string;
  client: string;
  note?: string;
  createdAt: string;
}

export async function getOwedSessions(token: string, clientId: string): Promise<OwedSession[]> {
  const res = await apiFetch(`${API_URL}/owed-sessions?client=${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createOwedSession(
  token: string,
  clientId: string,
  note?: string,
): Promise<OwedSession> {
  const res = await apiFetch(`${API_URL}/owed-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ client: clientId, note }),
  });
  return handleResponse(res);
}

export async function deleteOwedSession(token: string, id: string): Promise<true> {
  const res = await apiFetch(`${API_URL}/owed-sessions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}
