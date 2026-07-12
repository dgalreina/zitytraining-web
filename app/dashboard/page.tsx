'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsers } from '@/lib/api';

export default function DashboardHome() {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    getUsers(token)
      .then((users) => {
        setTotalUsers(users.length);
        setPendingCount(users.filter((u: any) => u.status === 'pending').length);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      });
  }, [router]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-white p-4">
        <p className="mb-1.5 text-xs font-semibold text-[#868585]">Usuarios totales</p>
        <p className="text-2xl font-bold text-[#2b2b2a]">{totalUsers}</p>
      </div>
      <div className="rounded-xl bg-white p-4">
        <p className="mb-1.5 text-xs font-semibold text-[#868585]">Clases hoy</p>
        <p className="text-2xl font-bold text-[#2b2b2a]">—</p>
      </div>
      <div className="rounded-xl bg-white p-4">
        <p className="mb-1.5 text-xs font-semibold text-[#868585]">Entrenadores</p>
        <p className="text-2xl font-bold text-[#2b2b2a]">—</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-[#a2c037] to-[#6aa842] p-4">
        <p className="mb-1.5 text-xs font-semibold text-[#eef7dd]">Pendientes de aprobar</p>
        <p className="text-2xl font-bold text-white">{pendingCount}</p>
      </div>
    </div>
  );
}