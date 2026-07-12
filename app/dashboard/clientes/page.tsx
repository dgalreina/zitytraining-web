'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { getUsers } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected';

function calculateAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    pending: 'Pendiente',
    rejected: 'Rechazado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getUsers(token)
      .then((users) => {
        setClients(users.filter((u: any) => u.roles?.includes('client')));
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.membershipNumber?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [clients, search, statusFilter]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Clientes
        </h2>
        <Link
          href="/dashboard/clientes/nuevo"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={16} />
          Nuevo cliente
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, email o nº de socio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="active">Activos</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl bg-white">
        {loading ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No se encontraron clientes.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-[#868585]">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Nº socio</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Edad</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client._id}
                  onClick={() => router.push(`/dashboard/clientes/${client._id}`)}
                  className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                >
                  <td className="px-5 py-3 font-medium text-[#2b2b2a]">
                    {client.firstName} {client.lastName}
                  </td>
                  <td className="px-5 py-3 text-[#868585]">
                    {client.membershipNumber || '—'}
                  </td>
                  <td className="px-5 py-3 text-[#868585]">{client.email}</td>
                  <td className="px-5 py-3 text-[#868585]">
                    {client.dateOfBirth ? calculateAge(client.dateOfBirth) : '—'}
                  </td>
                  <td className="px-5 py-3">{statusBadge(client.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}