export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return data.access_token as string;
    } catch (err) {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export const OFFLINE_MESSAGE = 'No hay conexión. Comprueba tu internet y vuelve a intentarlo.';

export async function fetchOrOffline(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(OFFLINE_MESSAGE);
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetchOrOffline(url, options);
  if (res.status !== 401) return res;
  const newToken = await tryRefreshToken();
  if (!newToken) return res;

  const headers = { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${newToken}` };
  return fetchOrOffline(url, { ...options, headers });
}

export async function handleResponse(res: Response) {
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (refreshToken) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
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
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
