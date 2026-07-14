const API_URL = 'http://localhost:3001';

async function handleResponse(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada, inicia sesión de nuevo');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message?.toString() || `Error ${res.status}`);
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error('Credenciales inválidas');
  }

  return res.json();
}

export async function getUsers(token: string) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getUser(token: string, id: string) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMe(token: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateMe(token: string, data: any) {
  const res = await fetch(`${API_URL}/users/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function createUserByAdmin(token: string, data: any) {
  const res = await fetch(`${API_URL}/users/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateUser(token: string, id: string, data: any) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function approveUser(token: string, id: string) {
  const res = await fetch(`${API_URL}/users/${id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function rejectUser(token: string, id: string) {
  const res = await fetch(`${API_URL}/users/${id}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}