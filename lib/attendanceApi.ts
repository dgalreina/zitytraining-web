import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface AttendanceEntry {
  _id: string;
  trainer?: { _id: string } | string;
  clockIn: string;
  clockOut?: string;
  manual?: boolean;
  autoClockedOut?: boolean;
}

export interface AttendanceStatus {
  clockedIn: boolean;
  since?: string;
}

export interface ManualAttendancePayload {
  clockIn?: string;
  clockOut?: string;
}

export async function clockIn(token: string): Promise<AttendanceEntry> {
  const res = await apiFetch(`${API_URL}/attendance/clock-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function clockOut(token: string): Promise<AttendanceEntry> {
  const res = await apiFetch(`${API_URL}/attendance/clock-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createManualAttendance(
  token: string,
  data: ManualAttendancePayload,
): Promise<AttendanceEntry> {
  const res = await apiFetch(`${API_URL}/attendance/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getAttendanceStatus(token: string): Promise<AttendanceStatus> {
  const res = await apiFetch(`${API_URL}/attendance/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMyAttendance(token: string): Promise<AttendanceEntry[]> {
  const res = await apiFetch(`${API_URL}/attendance/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateAttendance(
  token: string,
  id: string,
  data: ManualAttendancePayload,
): Promise<AttendanceEntry> {
  const res = await apiFetch(`${API_URL}/attendance/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteAttendance(token: string, id: string): Promise<true> {
  const res = await apiFetch(`${API_URL}/attendance/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return handleResponse(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

export async function getAllAttendance(
  token: string,
  from?: string,
  to?: string,
): Promise<AttendanceEntry[]> {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const qs = query.toString();
  const res = await apiFetch(`${API_URL}/attendance${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
