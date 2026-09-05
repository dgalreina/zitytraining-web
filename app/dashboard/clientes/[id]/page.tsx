'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getUser, getClientPurchases } from '@/lib/api';
import InfoTab from './InfoTab';
import ProgresoTab from './ProgresoTab';
import PlanTab from './PlanTab';
import HistorialTab from './HistorialTab';

type Tab = 'info' | 'progreso' | 'plan' | 'historial';

function tabButtonClass(active: boolean) {
  return `px-4 py-2.5 text-sm font-semibold transition ${
    active
      ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
      : 'text-[#868585] hover:text-[#2b2b2a]'
  }`;
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

export default function DetalleClientePage() {
  const [tab, setTab] = useState<Tab>('info');
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchases, setPurchases] = useState<any[] | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }

    const admin = storedUser ? JSON.parse(storedUser).roles?.includes('admin') : false;
    setIsAdmin(admin);

    getUser(token, id)
      .then((user) => {
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth?.split('T')[0] ?? '',
          email: user.email || '',
          phone: user.phone,
          address: user.address,
          status: user.status,
        });
      })
      .catch(() => setError('No se pudo cargar el cliente'))
      .finally(() => setLoading(false));

    getClientPurchases(token, id)
      .then(setPurchases)
      .catch(() => setPurchases([]));
  }, [id, router]);

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/clientes"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          {form.firstName} {form.lastName}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(form.status)}
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-none">
        <button onClick={() => setTab('info')} className={`shrink-0 whitespace-nowrap ${tabButtonClass(tab === 'info')}`}>
          Información
        </button>
        <Link
          href={`/dashboard/clientes/${id}/ficha-salud`}
          className="shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-[#868585] transition hover:text-[#2b2b2a]"
        >
          Ficha de salud
        </Link>
        <button onClick={() => setTab('progreso')} className={`shrink-0 whitespace-nowrap ${tabButtonClass(tab === 'progreso')}`}>
          Progreso
        </button>
        <button onClick={() => setTab('plan')} className={`shrink-0 whitespace-nowrap ${tabButtonClass(tab === 'plan')}`}>
          Plan activo
        </button>
        <button onClick={() => setTab('historial')} className={`shrink-0 whitespace-nowrap ${tabButtonClass(tab === 'historial')}`}>
          Historial
        </button>
      </div>

      <div className="h-[calc(100dvh-260px)] overflow-y-auto pr-1">
        {tab === 'info' && (
          <InfoTab id={id} client={form} isAdmin={isAdmin} onClientUpdated={setForm} />
        )}
        {tab === 'progreso' && <ProgresoTab id={id} />}
        {tab === 'plan' && (
          <PlanTab id={id} purchases={purchases} onPurchasesChange={setPurchases} />
        )}
        {tab === 'historial' && (
          <HistorialTab purchases={purchases} clientName={`${form.firstName} ${form.lastName}`} />
        )}
      </div>
    </div>
  );
}
