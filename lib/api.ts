const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// TODO: quitar todo este bloque de depuración (debugLog, decodeJwtPayload
// y las llamadas a debugLog de más abajo) en cuanto se localice por qué a
// veces se cierra la sesión sola. Se guarda en localStorage bajo una
// clave aparte (no la toca el borrado de sesión) para poder verla luego
// en /login aunque haya pasado en el móvil, donde no hay consola a mano.
const DEBUG_LOG_KEY = 'debug_auth_log';

function debugLog(event: string, details?: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(DEBUG_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.push({ time: new Date().toISOString(), event, ...details });
    while (log.length > 30) log.shift();
    localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(log));
  } catch {
    // Si falla el propio logging no debe romper nada más.
  }
}

// Lee el "exp" del JWT sin verificar la firma, solo para depurar si un
// token realmente había caducado o no en el momento del 401.
function decodeJwtExpiry(token: string): { exp: number; expiredAt: string; expired: boolean } | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const decoded = JSON.parse(json);
    if (!decoded.exp) return null;
    const expMs = decoded.exp * 1000;
    return { exp: decoded.exp, expiredAt: new Date(expMs).toISOString(), expired: expMs < Date.now() };
  } catch {
    return null;
  }
}

// Evita que dos peticiones que caducan a la vez disparen dos refrescos
// en paralelo (el segundo llegaría con un refresh token ya rotado por
// el primero y fallaría). Todas comparten la misma promesa en curso.
let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    debugLog('refresh_sin_refresh_token_guardado');
    return null;
  }

  debugLog('refresh_intentado');

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        debugLog('refresh_fallo', { status: res.status });
        return null;
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      debugLog('refresh_exito');
      return data.access_token as string;
    } catch (err) {
      debugLog('refresh_error_de_red', { message: String(err) });
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Todas las llamadas autenticadas pasan por aquí en vez de por fetch()
// directo: si el access token ya caducó (401), intenta renovarlo solo
// con el refresh token guardado y repite la petición una vez. Si el
// refresh también falla, handleResponse se encarga de cerrar la sesión.
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status !== 401) return res;

  debugLog('401_recibido', { url });
  const newToken = await tryRefreshToken();
  if (!newToken) return res;

  const headers = { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${newToken}` };
  return fetch(url, { ...options, headers });
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const exp = token ? decodeJwtExpiry(token) : null;
    // Esta es la entrada clave para depurar: si hadToken es true y
    // tokenExpirado es false, el token seguia siendo valido y el 401 no
    // fue por caducidad real (apunta al fallo pasajero de BBDD). Si
    // hadRefreshToken es false, no habia nada que refrescar (localStorage
    // vacio, ej. por el borrado de iOS).
    debugLog('logout_forzado', {
      url: res.url,
      hadToken: !!token,
      hadRefreshToken: !!refreshToken,
      tokenExpirado: exp ? exp.expired : null,
      tokenCaducaba: exp ? exp.expiredAt : null,
    });
    // TODO EXPERIMENTO: desactivado temporalmente el borrado de
    // localStorage y el mandar a /login ante un 401, para comprobar si
    // es este código el que causa el salto a login en móvil. El evento
    // sigue quedando registrado arriba (debugLog) para poder verlo.
    // Revertir a borrar token/refreshToken/user, avisar a /auth/logout
    // y hacer window.location.href = '/login' en cuanto tengamos la
    // respuesta.
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

export async function logout(refreshToken: string) {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Best-effort: si falla, el refresh token caduca solo a los 30 días.
  }
}

export async function getUsers(token: string, status?: string) {
  const query = status ? `?status=${status}` : '';
  const res = await apiFetch(`${API_URL}/users${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getUser(token: string, id: string) {
  const res = await apiFetch(`${API_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMe(token: string) {
  const res = await apiFetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateMe(token: string, data: any) {
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
) {
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

export async function getActiveClients(token: string) {
  const res = await apiFetch(`${API_URL}/users/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createUserByAdmin(token: string, data: any) {
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

export async function updateUser(token: string, id: string, data: any) {
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

export async function deleteUser(token: string, id: string) {
  const res = await apiFetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Progreso (peso, % grasa, etc.) ---

export async function createProgressEntry(token: string, data: any) {
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

export async function getProgressByClient(token: string, clientId: string) {
  const res = await apiFetch(`${API_URL}/progress/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Fichas de salud ---

export async function createHealthForm(token: string, data: any) {
  const res = await apiFetch(`${API_URL}/health-forms`, {
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
  const res = await apiFetch(`${API_URL}/health-forms/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateHealthForm(token: string, id: string, data: any) {
  const res = await apiFetch(`${API_URL}/health-forms/${id}`, {
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

  const res = await apiFetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createBooking(token: string, data: any) {
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

export async function updateBooking(token: string, id: string, data: any) {
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

export async function deleteBooking(token: string, id: string) {
  const res = await apiFetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return handleResponse(res);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return true;
}

// --- Purchases ---

export async function createPurchase(token: string, data: any) {
  const res = await apiFetch(`${API_URL}/purchases`, {
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
  const res = await apiFetch(`${API_URL}/purchases/${purchaseId}/checkout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMyPurchases(token: string) {
  const res = await apiFetch(`${API_URL}/purchases/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getClientPurchases(token: string, clientId: string) {
  const res = await apiFetch(`${API_URL}/purchases/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function assignPlan(token: string, data: any) {
  const res = await apiFetch(`${API_URL}/purchases/assign`, {
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
  const res = await apiFetch(`${API_URL}/purchases/assign-punctual`, {
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
  const res = await apiFetch(`${API_URL}/purchases/change`, {
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
  const res = await apiFetch(`${API_URL}/purchases/${purchaseId}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getAllBookings(token: string, from: string, to: string) {
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
) {
  const query = new URLSearchParams({ trainers: trainerIds.join(','), from, to });
  const res = await apiFetch(`${API_URL}/bookings?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Gestor de planes ---

export async function getPlans(token: string) {
  const res = await apiFetch(`${API_URL}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createPlan(token: string, data: any) {
  const res = await apiFetch(`${API_URL}/plans`, {
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
  const res = await apiFetch(`${API_URL}/plans/${id}`, {
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
  const res = await apiFetch(`${API_URL}/plans/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Fichar (entrenadores) ---

export async function clockIn(token: string) {
  const res = await apiFetch(`${API_URL}/attendance/clock-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function clockOut(token: string) {
  const res = await apiFetch(`${API_URL}/attendance/clock-out`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createManualAttendance(token: string, data: { clockIn?: string; clockOut?: string }) {
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

export async function getAttendanceStatus(token: string) {
  const res = await apiFetch(`${API_URL}/attendance/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMyAttendance(token: string) {
  const res = await apiFetch(`${API_URL}/attendance/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getAllAttendance(token: string, from?: string, to?: string) {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const qs = query.toString();
  const res = await apiFetch(`${API_URL}/attendance${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// --- Entrenamientos ---

export async function searchExercises(token: string, q: string) {
  const res = await apiFetch(`${API_URL}/exercises?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createExercise(token: string, name: string, category?: string) {
  const res = await apiFetch(`${API_URL}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, category }),
  });
  return handleResponse(res);
}

export async function getExercises(token: string) {
  const res = await apiFetch(`${API_URL}/exercises`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateExercise(token: string, id: string, name: string, category?: string) {
  const res = await apiFetch(`${API_URL}/exercises/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, category }),
  });
  return handleResponse(res);
}

export async function deleteExercise(token: string, id: string) {
  const res = await apiFetch(`${API_URL}/exercises/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getWorkouts(token: string) {
  const res = await apiFetch(`${API_URL}/workouts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createWorkout(
  token: string,
  data: {
    name: string;
    slots: {
      exerciseId: string;
      reps?: number[];
      linkedToNext?: boolean;
      restPause?: boolean;
      notes?: string;
    }[];
  },
) {
  const res = await apiFetch(`${API_URL}/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateWorkout(
  token: string,
  id: string,
  data: {
    name: string;
    slots: {
      exerciseId: string;
      reps?: number[];
      linkedToNext?: boolean;
      restPause?: boolean;
      notes?: string;
    }[];
  },
) {
  const res = await apiFetch(`${API_URL}/workouts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteWorkout(token: string, id: string) {
  const res = await apiFetch(`${API_URL}/workouts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
