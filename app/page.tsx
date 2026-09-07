'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// TODO EXPERIMENTO: desactivado temporalmente el mandar a /login cuando
// no hay token, para averiguar si el salto a login en móvil lo provoca
// este código o no. Revertir a "else { router.push('/login'); }" en
// cuanto tengamos la respuesta.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard/calendario');
    }
  }, [router]);

  return null; // no muestra nada, solo redirige
}