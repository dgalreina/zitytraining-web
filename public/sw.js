// Service worker escrito a mano (sin Serwist/Workbox): Next 16 usa Turbopack
// por defecto para build, y el plugin de Serwist para Next todavía necesita
// configuración de webpack, así que no se puede confiar en que se ejecute.
// Esto es solo caché de LECTURA (network-first con fallback a caché) para
// poder ver la app sin conexión; la cola de escritura offline del
// calendario vive aparte, en lib/offlineQueue.ts.

const CACHE_NAME = 'zitytraining-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo se cachean lecturas: una petición de escritura sin red debe
  // fallar de verdad, es la señal que ya usa fetchOrOffline (lib/apiClient.ts)
  // para decidir si algo hay que meterlo en la cola offline.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Las fichas de salud quedan fuera de cualquier caché a propósito (dato
  // sensible): ni se guardan ni se sirven offline.
  if (url.pathname.includes('/health-forms')) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Solo se cachea una respuesta válida; un 401/500 sigue su curso normal
    // (no se cae a caché, para no esconder una sesión caducada).
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Fallo de red real: aquí sí se recurre a la última copia guardada.
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}
