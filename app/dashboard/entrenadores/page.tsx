'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, ShieldCheck, RotateCcw, Dumbbell } from 'lucide-react';
import ColorDot from '@/components/ColorDot';
import StatusFilterDropdown from '@/components/StatusFilterDropdown';
import { statusBadge } from '@/components/StatusBadge';
import { getUsers, updateUser } from '@/lib/usersApi';

type StatusFilter = 'all' | 'active' | 'inactive' | 'deleted';

// "Eliminados" va aparte a propósito: no entra dentro de "Todos", solo
// se ve si se elige explícitamente (como una papelera).
const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'deleted', label: 'Eliminados' },
];

export default function EntrenadoresPage() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [deletedTrainers, setDeletedTrainers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getUsers(token)
      .then((users) => {
        setTrainers(users.filter((u: any) => u.roles?.includes('trainer')));
      })
      .finally(() => setLoading(false));
  }, [router]);

  // La papelera se carga aparte y solo cuando hace falta: son entrenadores
  // que el listado normal (findAll) excluye a propósito.
  useEffect(() => {
    if (statusFilter !== 'deleted') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingDeleted(true);
    getUsers(token, 'deleted')
      .then((users) => setDeletedTrainers(users.filter((u: any) => u.roles?.includes('trainer'))))
      .finally(() => setLoadingDeleted(false));
  }, [statusFilter]);

  async function handleRestore(e: React.MouseEvent, trainerId: string) {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) return;
    setRestoringId(trainerId);
    try {
      const updated = await updateUser(token, trainerId, { status: 'active' });
      setDeletedTrainers((prev) => prev.filter((t) => t._id !== trainerId));
      // Para que aparezca ya mismo en Todos/Activos sin salir y volver a entrar.
      setTrainers((prev) => [...prev.filter((t) => t._id !== trainerId), updated]);
    } catch {
      // Silencioso a propósito: si falla, el entrenador simplemente sigue
      // apareciendo en la papelera para reintentar.
    } finally {
      setRestoringId(null);
    }
  }

  const isTrashView = statusFilter === 'deleted';
  const sourceTrainers = isTrashView ? deletedTrainers : trainers;
  const isLoadingList = isTrashView ? loadingDeleted : loading;

  const filtered = useMemo(() => {
    return sourceTrainers.filter((t) => {
      const matchesStatus = isTrashView || statusFilter === 'all' || t.status === statusFilter;
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        t.email?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [sourceTrainers, search, statusFilter, isTrashView]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          <Dumbbell size={20} />
          Entrenadores
        </h2>
        <Link
          href="/dashboard/entrenadores/nuevo"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={16} />
          Nuevo entrenador
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

        <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
      </div>

      <div className="hidden overflow-hidden rounded-xl bg-white md:block">
        {isLoadingList ? (
          <p className="p-6 text-sm text-gray-400">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">
            {isTrashView ? 'No hay entrenadores eliminados.' : 'No se encontraron entrenadores.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-[#868585]">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                {isTrashView && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((trainer) => (
                <tr
                  key={trainer._id}
                  onClick={() => router.push(`/dashboard/entrenadores/${trainer._id}`)}
                  className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                >
                  <td className="px-5 py-3 font-medium text-[#2b2b2a]">
                    <span className="flex items-center gap-2">
                      <ColorDot color={trainer.color} />
                      {trainer.firstName} {trainer.lastName}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#868585]">{trainer.email}</td>
                  <td className="px-5 py-3 text-[#868585]">{trainer.phone}</td>
                  <td className="px-5 py-3">
                    {trainer.roles?.includes('admin') ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#4b7a1f]">
                        <ShieldCheck size={13} />
                        Administrador
                      </span>
                    ) : (
                      <span className="text-xs text-[#868585]">Entrenador</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{statusBadge(trainer.status)}</td>
                  {isTrashView && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => handleRestore(e, trainer._id)}
                        disabled={restoringId === trainer._id}
                        className="flex items-center gap-1.5 rounded-lg bg-[#a2c037]/15 px-3 py-1.5 text-xs font-semibold text-[#4b7a1f] hover:bg-[#a2c037]/25 disabled:opacity-60"
                      >
                        <RotateCcw size={13} />
                        {restoringId === trainer._id ? 'Restaurando...' : 'Restaurar'}
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
            {isTrashView ? 'No hay entrenadores eliminados.' : 'No se encontraron entrenadores.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((trainer) => (
              <div
                key={trainer._id}
                onClick={() => router.push(`/dashboard/entrenadores/${trainer._id}`)}
                className="cursor-pointer rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition active:bg-gray-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-[#2b2b2a]">
                    <ColorDot color={trainer.color} />
                    {trainer.firstName} {trainer.lastName}
                  </span>
                  {statusBadge(trainer.status)}
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-[#868585]">
                  <span>{trainer.email}</span>
                  <span>{trainer.phone}</span>
                  {trainer.roles?.includes('admin') ? (
                    <span className="flex items-center gap-1 font-semibold text-[#4b7a1f]">
                      <ShieldCheck size={12} />
                      Administrador
                    </span>
                  ) : (
                    <span>Entrenador</span>
                  )}
                </div>
                {isTrashView && (
                  <button
                    onClick={(e) => handleRestore(e, trainer._id)}
                    disabled={restoringId === trainer._id}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#a2c037]/15 px-3 py-1.5 text-xs font-semibold text-[#4b7a1f] hover:bg-[#a2c037]/25 disabled:opacity-60"
                  >
                    <RotateCcw size={13} />
                    {restoringId === trainer._id ? 'Restaurando...' : 'Restaurar'}
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
