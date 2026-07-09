'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers } from '@/lib/api';

export default function Dashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getUsers(token)
      .then(setUsers)
      .catch(() => setError('No autorizado o token expirado'));
  }, [router]);

  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Dashboard — Usuarios</h1>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </main>
  );
}