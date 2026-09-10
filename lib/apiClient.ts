export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// TODO: quitar todo este bloque de depuración (debugLog, decodeJwtExpiry
// y las llamadas a debugLog de más abajo) en cuanto se localice por qué a
// veces se cierra la sesión sola. Se guarda en localStorage bajo una
// clave aparte (no la toca el borrado de sesión) para poder verla luego
// en /login aunque haya pasado en el móvil, donde no hay consola a mano.
const DEBUG_LOG_KEY = 'debug_auth_log';

export function debugLog(event: string, details?: Record<string, unknown>) {
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
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status !== 401) return res;

  debugLog('401_recibido', { url });
  const newToken = await tryRefreshToken();
  if (!newToken) return res;

  const headers = { ...(options.headers as Record<string, string> | undefined), Authorization: `Bearer ${newToken}` };
  return fetch(url, { ...options, headers });
}

export async function handleResponse(res: Response) {
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
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (refreshToken) {
      // Best-effort: si el refresh token seguía siendo válido en el
      // servidor (esto era otro fallo de auth), lo revocamos igual.
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
  // res.json() sobre una respuesta vacía explota ("Unexpected end of
  // JSON input" en Chrome, "did not match the expected pattern" en
  // Safari — mismo fallo, cada motor lo describe a su manera).
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
