import { API_URL } from './apiClient';

// Pública (sin login): para enseñar en el pie del menú qué versión del
// backend está corriendo, sin esperar a tener token.
export async function getApiVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/version`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}
