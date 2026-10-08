'use client';

import { useEffect } from 'react';

// Registra el service worker de public/sw.js (ver ese archivo para la
// estrategia de caché). No pinta nada, solo lo engancha una vez al cargar
// la app.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin red en el primerísimo registro, por ejemplo: no hay nada que
      // avisar, se reintentará solo en la siguiente carga.
    });
  }, []);

  return null;
}
