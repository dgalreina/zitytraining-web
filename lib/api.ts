const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  // Algunos endpoints (ej. cambiar contraseña) responden 200 sin body;
  // res.json() sobre una respuesta vacía explota ("Unexpected end of
  // JSON input" en Chrome, "did not match the expected pattern" en
  // Safari — mismo fallo, cada motor lo describe a su manera).
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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

export async function getUsers(token: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_URL}/users${query}`, {
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

export async function changeMyPassword(
  token: string,
  data: { currentPassword: string; newPassword: string },
) {
  const res = await fetch(`${API_URL}/users/me/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getActiveClients(token: string) {
  const res = await fetch(`${API_URL}/users/clients`, {
    headers: { Authorization: `Bearer ${token}` },
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

export async function deleteUser(token: string, id: string) {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Progreso (peso, % grasa, etc.) ---

export async function createProgressEntry(token: string, data: any) {
  const res = await fetch(`${API_URL}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getProgressByClient(token: string, clientId: string) {
  const res = await fetch(`${API_URL}/progress/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Fichas de salud ---

export async function createHealthForm(token: string, data: any) {
  const res = await fetch(`${API_URL}/health-forms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getHealthFormByClient(token: string, clientId: string) {
  const res = await fetch(`${API_URL}/health-forms/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateHealthForm(token: string, id: string, data: any) {
  const res = await fetch(`${API_URL}/health-forms/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// --- Bookings ---

export async function getBookings(
  token: string,
  params: { trainer?: string; client?: string; from: string; to: string },
) {
  const query = new URLSearchParams();
  if (params.trainer) query.set('trainer', params.trainer);
  if (params.client) query.set('client', params.client);
  query.set('from', params.from);
  query.set('to', params.to);

  const res = await fetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createBooking(token: string, data: any) {
  const res = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateBooking(token: string, id: string, data: any) {
  const res = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteBooking(token: string, id: string) {
  const res = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return handleResponse(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

// --- Purchases ---

export async function createPurchase(token: string, data: any) {
  const res = await fetch(`${API_URL}/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function createCheckoutSession(token: string, purchaseId: string) {
  const res = await fetch(`${API_URL}/purchases/${purchaseId}/checkout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMyPurchases(token: string) {
  const res = await fetch(`${API_URL}/purchases/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getClientPurchases(token: string, clientId: string) {
  const res = await fetch(`${API_URL}/purchases/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function assignPlan(token: string, data: any) {
  const res = await fetch(`${API_URL}/purchases/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function assignPunctualPlan(token: string, data: any) {
  const res = await fetch(`${API_URL}/purchases/assign-punctual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function changePlan(token: string, data: any) {
  const res = await fetch(`${API_URL}/purchases/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function cancelPurchase(token: string, purchaseId: string) {
  const res = await fetch(`${API_URL}/purchases/${purchaseId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getAllBookings(token: string, from: string, to: string) {
  const query = new URLSearchParams({ scope: 'all', from, to });
  const res = await fetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getBookingsByTrainers(
  token: string,
  trainerIds: string[],
  from: string,
  to: string,
) {
  const query = new URLSearchParams({ trainers: trainerIds.join(','), from, to });
  const res = await fetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Gestor de planes ---

export async function getPlans(token: string) {
  const res = await fetch(`${API_URL}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createPlan(token: string, data: any) {
  const res = await fetch(`${API_URL}/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updatePlan(token: string, id: string, data: any) {
  const res = await fetch(`${API_URL}/plans/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deletePlan(token: string, id: string) {
  const res = await fetch(`${API_URL}/plans/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}