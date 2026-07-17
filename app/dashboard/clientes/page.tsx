'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ChevronDown, Check } from 'lucide-react';
import { getUsers } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'active', label: 'Activos' },
  { value: 'rejected', label: 'Rechazados' },
];

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

function StatusFilterDropdown({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = statusOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none sm:w-52"
      >
        {selected?.label}
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-full min-w-[180px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                option.value === value
                  ? 'bg-[#a2c037]/10 font-semibold text-[#4b7a1f]'
                  : 'text-[#2b2b2a] hover:bg-gray-50'
              }`}
            >
              {option.label}
              {option.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
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

        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="hidden overflow-hidden rounded-xl bg-white md:block">
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

      {/* Tarjetas para móvil */}
      <div className="md:hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No se encontraron clientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((client) => (
              <div
                key={client._id}
                onClick={() => router.push(`/dashboard/clientes/${client._id}`)}
                className="cursor-pointer rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition active:bg-gray-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-[#2b2b2a]">
                    {client.firstName} {client.lastName}
                  </span>
                  {statusBadge(client.status)}
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-[#868585]">
                  <span>Nº socio: {client.membershipNumber || '—'}</span>
                  <span>{client.email}</span>
                  <span>
                    Edad: {client.dateOfBirth ? calculateAge(client.dateOfBirth) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}