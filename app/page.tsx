'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenWithRetry } from '@/lib/authStorage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    return getTokenWithRetry((token) => {
      router.push(token ? '/dashboard/calendario' : '/login');
    });
  }, [router]);

  return null; // no muestra nada, solo redirige
}
