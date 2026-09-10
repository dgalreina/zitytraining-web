import { API_URL, apiFetch, handleResponse } from './apiClient';
import { Workout } from './workoutsApi';

export interface BookingPersonRef {
  _id: string;
  firstName: string;
  lastName: string;
  color?: string;
  status?: string;
  roles?: string[];
}

export interface Booking {
  _id: string;
  trainer: BookingPersonRef;
  clients: BookingPersonRef[];
  startTime: string;
  endTime: string;
  status: string;
  isPrivate: boolean;
  notes?: string;
  workout?: Workout | null;
  series?: string;
  holidaySkip?: boolean;
}

export interface CreateBookingPayload {
  trainer: string;
  clients: string[];
  startTime: string;
  endTime: string;
  notes?: string;
  isPrivate: boolean;
  workoutId?: string | null;
  recurrence?: string;
}

export interface UpdateBookingPayload {
  trainer?: string;
  clients?: string[];
  startTime?: string;
  endTime?: string;
  notes?: string;
  isPrivate?: boolean;
  workoutId?: string | null;
  holidaySkip?: boolean;
  status?: string;
}

export async function getBookings(
  token: string,
  params: { trainer?: string; client?: string; from: string; to: string },
): Promise<Booking[]> {
  const query = new URLSearchParams();
  if (params.trainer) query.set('trainer', params.trainer);
  if (params.client) query.set('client', params.client);
  query.set('from', params.from);
  query.set('to', params.to);

  const res = await apiFetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createBooking(token: string, data: CreateBookingPayload): Promise<Booking> {
  const res = await apiFetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateBooking(
  token: string,
  id: string,
  data: UpdateBookingPayload,
): Promise<Booking> {
  const res = await apiFetch(`${API_URL}/bookings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteBooking(token: string, id: string): Promise<true> {
  const res = await apiFetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return handleResponse(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

// Borra esta sesión y todas las futuras de su serie (el pasado no se toca).
export async function deleteBookingSeries(token: string, id: string): Promise<true> {
  const res = await apiFetch(`${API_URL}/bookings/${id}/series`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return handleResponse(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

export async function getAllBookings(token: string, from: string, to: string): Promise<Booking[]> {
  const query = new URLSearchParams({ scope: 'all', from, to });
  const res = await apiFetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getBookingsByTrainers(
  token: string,
  trainerIds: string[],
  from: string,
  to: string,
): Promise<Booking[]> {
  const query = new URLSearchParams({ trainers: trainerIds.join(','), from, to });
  const res = await apiFetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
