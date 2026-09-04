'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ChevronDown, Check, RotateCcw } from 'lucide-react';
import { getUsers, getActiveClients, updateUser } from '@/lib/api';

type StatusFilter = 'all' | 'active' | 'inactive' | 'deleted';

// "Eliminados" va aparte a propósito: no entra dentro de "Todos", solo
// se ve si se elige explícitamente (como una papelera).
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'deleted', label: 'Eliminados' },
];

function calculateAge(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    inactive: 'bg-gray-100 text-gray-600',
    deleted: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    deleted: 'Eliminado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.inactive}`}>
      {labels[status] || status}
    </span>
  );
}

function StatusFilterDropdown({
  value,
  onChange,
  options,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  options: { value: StatusFilter; label: string }[];
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

  const selected = options.find((o) => o.value === value);

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
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                option.value === 'deleted' ? 'mt-1 border-t border-gray-100 pt-2' : ''
              } ${
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
  const [deletedClients, setDeletedClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }

    const admin = storedUser ? JSON.parse(storedUser).roles?.includes('admin') : false;
    setIsAdmin(admin);

    if (admin) {
      getUsers(token)
        .then((users) => {
          setClients(users.filter((u: any) => u.roles?.includes('client')));
        })
        .finally(() => setLoading(false));
    } else {
      // Entrenador: solo puede ver clientes activos, sin datos de aprobación
      getActiveClients(token)
        .then(setClients)
        .finally(() => setLoading(false));
    }
  }, [router]);

  // La papelera se carga aparte y solo cuando hace falta: son clientes
  // que el listado normal (findAll) excluye a propósito.
  useEffect(() => {
    if (!isAdmin || statusFilter !== 'deleted') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingDeleted(true);
    getUsers(token, 'deleted')
      .then((users) => setDeletedClients(users.filter((u: any) => u.roles?.includes('client'))))
      .finally(() => setLoadingDeleted(false));
  }, [isAdmin, statusFilter]);

  async function handleRestore(e: React.MouseEvent, clientId: string) {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) return;
    setRestoringId(clientId);
    try {
      await updateUser(token, clientId, { status: 'active' });
      setDeletedClients((prev) => prev.filter((c) => c._id !== clientId));
    } catch {
      // Silencioso a propósito: si falla, el cliente simplemente sigue
      // apareciendo en la papelera para reintentar.
    } finally {
      setRestoringId(null);
    }
  }

  const statusFilterOptions = isAdmin ? statusOptions : statusOptions.filter((o) => o.value !== 'deleted');
  const isTrashView = statusFilter === 'deleted';
  const sourceClients = isTrashView ? deletedClients : clients;
  const isLoadingList = isTrashView ? loadingDeleted : loading;

  const filtered = useMemo(() => {
    return sourceClients.filter((c) => {
      const matchesStatus = isTrashView || statusFilter === 'all' || c.status === statusFilter;
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [sourceClients, search, statusFilter, isTrashView]);

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
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
          />
        </div>

        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusFilterOptions} />
      </div>

      <div className="hidden overflow-hidden rounded-xl bg-white md:block">
        {isLoadingList ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">
            {isTrashView ? 'No hay clientes eliminados.' : 'No se encontraron clientes.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-[#868585]">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Edad</th>
                <th className="px-5 py-3">Estado</th>
                {isTrashView && <th className="px-5 py-3"></th>}
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
                  <td className="px-5 py-3 text-[#868585]">{client.email || '—'}</td>
                  <td className="px-5 py-3 text-[#868585]">
                    {client.dateOfBirth ? calculateAge(client.dateOfBirth) : '—'}
                  </td>
                  <td className="px-5 py-3">{statusBadge(client.status || 'active')}</td>
                  {isTrashView && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => handleRestore(e, client._id)}
                        disabled={restoringId === client._id}
                        className="flex items-center gap-1.5 rounded-lg bg-[#a2c037]/15 px-3 py-1.5 text-xs font-semibold text-[#4b7a1f] hover:bg-[#a2c037]/25 disabled:opacity-60"
                      >
                        <RotateCcw size={13} />
                        {restoringId === client._id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tarjetas para móvil */}
      <div className="md:hidden">
        {isLoadingList ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">
            {isTrashView ? 'No hay clientes eliminados.' : 'No se encontraron clientes.'}
          </p>
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
                  {statusBadge(client.status || 'active')}
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-[#868585]">
                  <span>{client.email || 'Sin email'}</span>
                  <span>
                    Edad: {client.dateOfBirth ? calculateAge(client.dateOfBirth) : '—'}
                  </span>
                </div>
                {isTrashView && (
                  <button
                    onClick={(e) => handleRestore(e, client._id)}
                    disabled={restoringId === client._id}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#a2c037]/15 px-3 py-1.5 text-xs font-semibold text-[#4b7a1f] hover:bg-[#a2c037]/25 disabled:opacity-60"
                  >
                    <RotateCcw size={13} />
                    {restoringId === client._id ? 'Restaurando...' : 'Restaurar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
