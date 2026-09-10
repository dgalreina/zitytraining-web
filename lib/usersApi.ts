import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  roles: string[];
  color?: string | null;
  status: string;
  isFavorite?: boolean;
}

export interface UpdateMePayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  color?: string | null;
}

export interface CreateUserByAdminPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  password?: string;
  phone: string;
  address?: string;
  roles: string[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
  color?: string | null;
  status?: string;
  roles?: string[];
}

export async function getUsers(token: string, status?: string): Promise<User[]> {
  const query = status ? `?status=${status}` : '';
  const res = await apiFetch(`${API_URL}/users${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getUser(token: string, id: string): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMe(token: string): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateMe(token: string, data: UpdateMePayload): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function changeMyPassword(
  token: string,
  data: { currentPassword: string; newPassword: string },
): Promise<null> {
  const res = await apiFetch(`${API_URL}/users/me/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getActiveClients(token: string): Promise<User[]> {
  const res = await apiFetch(`${API_URL}/users/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function addFavoriteClient(token: string, clientId: string): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/clients/${clientId}/favorite`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function removeFavoriteClient(token: string, clientId: string): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/clients/${clientId}/favorite`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createUserByAdmin(token: string, data: CreateUserByAdminPayload): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateUser(token: string, id: string, data: UpdateUserPayload): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteUser(token: string, id: string): Promise<User> {
  const res = await apiFetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
