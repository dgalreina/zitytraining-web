import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface ReminderLog {
  clientId: string;
  // Días y horas que se le anunciaron. Si no coincide con lo que hay
  // ahora, es que su semana cambió desde que se le escribió.
  sessionsFingerprint: string;
  sentAt: string;
}

export async function getWeekReminders(
  token: string,
  weekStart: string,
): Promise<ReminderLog[]> {
  const res = await apiFetch(`${API_URL}/reminders?weekStart=${encodeURIComponent(weekStart)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function logReminderSent(
  token: string,
  data: { client: string; weekStart: string; sessionsFingerprint: string },
): Promise<{ success: true }> {
  const res = await apiFetch(`${API_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
