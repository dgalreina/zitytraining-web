import { API_URL } from './apiClient';

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

// Responde lo mismo exista o no la dirección, a propósito: así nadie
// puede usar esto para descubrir qué correos están registrados.
export async function forgotPassword(email: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      Array.isArray(data?.message) ? data.message[0] : data?.message || 'No se pudo enviar el correo',
    );
  }

  return res.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      Array.isArray(data?.message) ? data.message[0] : data?.message || 'No se pudo cambiar la contraseña',
    );
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
