// TODO: si tras un tiempo de prueba esto no mejora el problema de que a
// veces la app arranca en login teniendo la sesión guardada, quitar este
// reintento y volver a leer localStorage.getItem('token') directamente.
const STORAGE_RETRY_DELAY_MS = 200;

// En un arranque en frío en iOS (sobre todo como PWA instalada), a veces
// localStorage tarda un instante en "engancharse" tras relanzar la app:
// una primera lectura justo al montar puede devolver null aunque el dato
// siga ahí. En vez de fiarse de esa única lectura para decidir que no
// hay sesión, se reintenta una vez tras una pequeña espera.
export function getTokenWithRetry(callback: (token: string | null) => void): () => void {
  const first = localStorage.getItem('token');
  if (first) {
    callback(first);
    return () => {};
  }

  const timeoutId = setTimeout(() => {
    callback(localStorage.getItem('token'));
  }, STORAGE_RETRY_DELAY_MS);

  return () => clearTimeout(timeoutId);
}
