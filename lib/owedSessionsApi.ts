import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface OwedSession {
  _id: string;
  client: string;
  note?: string;
  createdAt: string;
  // Con valor: ya se dio la clase que la recupera, pero sigue en la
  // lista hasta que se borra a mano. Sin valor: todavía pendiente.
  recoveredNote?: string;
}

export async function getOwedSessions(token: string, clientId: string): Promise<OwedSession[]> {
  const res = await apiFetch(`${API_URL}/owed-sessions?client=${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// Cuántas clases pendientes (sin recuperar) se le deben a cada uno de
// estos clientes. Lo usa el calendario para solo enseñar la opción de
// "clase debida" cuando de verdad hay algo que recuperar.
export async function getPendingOwedCounts(
  token: string,
  clientIds: string[],
): Promise<Record<string, number>> {
  if (clientIds.length === 0) return {};
  const res = await apiFetch(`${API_URL}/owed-sessions/pending-count?clients=${clientIds.join(',')}`, {
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
