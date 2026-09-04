'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Check, X, Pencil, Clock, Ban } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import {
  getUser,
  updateUser,
  approveUser,
  rejectUser,
  getClientPurchases,
  getProgressByClient,
  createProgressEntry,
  assignPlan,
  assignPunctualPlan,
  changePlan,
  cancelPurchase,
} from '@/lib/api';
import { TRAINING_CATEGORIES, TRAINING_PLANS, TrainingPlan } from '@/lib/pricing';

type Tab = 'info' | 'progreso' | 'plan' | 'historial';

function tabButtonClass(active: boolean) {
  return `px-4 py-2.5 text-sm font-semibold transition ${
    active
      ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
      : 'text-[#868585] hover:text-[#2b2b2a]'
  }`;
}

const PROGRESS_METRICS: { key: string; label: string; unit: string }[] = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'bodyFatPercent', label: '% grasa', unit: '%' },
  { key: 'water', label: 'H2O', unit: '%' },
  { key: 'muscleMass', label: 'MM', unit: 'kg' },
  { key: 'visceralFat', label: 'Visceral', unit: '' },
  { key: 'boneMass', label: 'Ósea', unit: 'kg' },
];

const emptyProgressForm = {
  date: new Date().toISOString().split('T')[0],
  weight: '',
  bodyFatPercent: '',
  water: '',
  muscleMass: '',
  visceralFat: '',
  boneMass: '',
};

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

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

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeShort(date: string | Date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

const FALLBACK_ACTOR_COLOR = '#868585'; // igual que en el calendario, para entrenadores/clientes sin color propio

function actorName(userRef: any, fallback: string) {
  return userRef?.firstName ? `${userRef.firstName} ${userRef.lastName}` : fallback;
}

function actorColor(userRef: any) {
  return userRef?.color || FALLBACK_ACTOR_COLOR;
}

// Convierte cada compra en 1 o 2 eventos: cuando se contrato y, si
// aplica, cuando/por que acabo (cancelada, cambiada por otra, o
// caducada sola si era un plan puntual). Cada evento lleva fecha,
// concepto (nombre del plan + accion) y autor (con su color, como en
// el calendario) por separado, para pintarlos en columnas.
function buildHistoryEvents(purchases: any[], clientName: string) {
  const events: {
    id: string;
    date: Date;
    itemLabel: string;
    action: string;
    author: string;
    authorColor: string;
  }[] = [];

  for (const p of purchases) {
    const creator = actorName(p.createdBy, p.assignedInPerson ? 'el equipo' : `${clientName} (cliente)`);
    events.push({
      id: `${p._id}-created`,
      date: new Date(p.createdAt),
      itemLabel: p.itemLabel,
      action: 'contratado',
      author: creator,
      authorColor: actorColor(p.createdBy),
    });

    if (p.endedAt) {
      const ender = actorName(p.endedBy, '');
      if (p.endReason === 'changed') {
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: `cambiado a "${p.replacedByLabel}"`,
          author: ender,
          authorColor: actorColor(p.endedBy),
        });
      } else if (p.endReason === 'cancelled') {
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: 'cancelado',
          author: ender,
          authorColor: actorColor(p.endedBy),
        });
      } else if (p.scheduledEndDate) {
        // Plan puntual que llego solo a su fecha de fin, sin que nadie lo parara a mano.
        events.push({
          id: `${p._id}-ended`,
          date: new Date(p.endedAt),
          itemLabel: p.itemLabel,
          action: 'finalizado (fin de plan puntual)',
          author: '',
          authorColor: FALLBACK_ACTOR_COLOR,
        });
      }
    }
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function purchaseStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    paused: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente de confirmar',
    active: 'Activo',
    paused: 'En pausa',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function DetalleClientePage() {
  const [tab, setTab] = useState<Tab>('info');
  const [form, setForm] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchases, setPurchases] = useState<any[] | null>(null);
  const [progressEntries, setProgressEntries] = useState<any[] | null>(null);
  const [progressSubTab, setProgressSubTab] = useState<'hoy' | 'evolucion'>('hoy');
  const [progressForm, setProgressForm] = useState(emptyProgressForm);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [progressSaved, setProgressSaved] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'new' | 'punctual' | 'change'>('new');
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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
        const data = {
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth?.split('T')[0] ?? '',
          email: user.email || '',
          phone: user.phone,
          address: user.address,
          status: user.status,
        };
        setForm(data);
        setOriginal(data);
      })
      .catch(() => setError('No se pudo cargar el cliente'))
      .finally(() => setLoading(false));

    getClientPurchases(token, id)
      .then(setPurchases)
      .catch(() => setPurchases([]));

    getProgressByClient(token, id)
      .then(setProgressEntries)
      .catch(() => setProgressEntries([]));
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function setProgressField(key: keyof typeof emptyProgressForm, value: string) {
    setProgressForm((f) => ({ ...f, [key]: value }));
    setProgressSaved(false);
  }

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProgressError('');
    setProgressSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));

    try {
      const created = await createProgressEntry(token, {
        client: id,
        date: progressForm.date,
        weight: toNum(progressForm.weight),
        bodyFatPercent: toNum(progressForm.bodyFatPercent),
        water: toNum(progressForm.water),
        muscleMass: toNum(progressForm.muscleMass),
        visceralFat: toNum(progressForm.visceralFat),
        boneMass: toNum(progressForm.boneMass),
      });
      setProgressEntries((prev) => [...(prev || []), created]);
      setProgressForm(emptyProgressForm);
      setProgressSaved(true);
    } catch (err: any) {
      setProgressError(err.message || 'No se pudo guardar la medición');
    } finally {
      setProgressSaving(false);
    }
  }

  function openAssignPicker(mode: 'new' | 'punctual' | 'change') {
    setAssignMode(mode);
    setSelectedPlan(null);
    setAssignStartDate(new Date().toISOString().split('T')[0]);
    setAssignEndDate('');
    setAssignError('');
    setAssignModalOpen(true);
  }

  function openAssignModal(plan: TrainingPlan) {
    setSelectedPlan(plan);
    setAssignError('');
  }

  async function handleAssignConfirm() {
    if (!selectedPlan) return;
    if (assignMode === 'punctual' && !assignEndDate) {
      setAssignError('Elige la fecha de fin del plan puntual');
      return;
    }
    setAssignSaving(true);
    setAssignError('');

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const categoryTitle = TRAINING_CATEGORIES.find((c) => c.id === selectedPlan.category)?.title;
      const payload = {
        client: id,
        itemId: selectedPlan.id,
        itemLabel: `${selectedPlan.label} (${categoryTitle})`,
        price: selectedPlan.monthlyPrice,
        startDate: assignStartDate,
      };
      if (assignMode === 'punctual') {
        await assignPunctualPlan(token, { ...payload, endDate: assignEndDate });
      } else if (assignMode === 'change') {
        await changePlan(token, payload);
      } else {
        await assignPlan(token, payload);
      }
      // Un plan puntual (o un cambio de plan) puede afectar a otro plan
      // existente; recargamos del todo en vez de solo anteponer el
      // nuevo, para reflejarlo.
      const refreshed = await getClientPurchases(token, id);
      setPurchases(refreshed);
      setAssignModalOpen(false);
      setSelectedPlan(null);
    } catch (err: any) {
      setAssignError(err.message || 'No se pudo asignar el plan');
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleCancelPlan(purchaseId: string) {
    if (!window.confirm('¿Seguro que quieres parar este plan?')) return;
    setCancellingId(purchaseId);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await cancelPurchase(token, purchaseId);
      // Cancelar un plan puntual retoma el que hubiera pausado, y el
      // registro que vuelve trae el autor sin popular; recargamos del
      // todo en vez de solo sustituir este, para reflejar ambas cosas.
      const refreshed = await getClientPurchases(token, id);
      setPurchases(refreshed);
    } catch (err: any) {
      alert(err.message || 'No se pudo parar el plan');
    } finally {
      setCancellingId(null);
    }
  }

  function handleCancel() {
    setForm(original);
    setError('');
    setEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { status, ...data } = form;
      const updated = await updateUser(token, id, {
        ...data,
        email: data.email || undefined,
      });
      const newData = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email || '',
        phone: updated.phone,
        address: updated.address,
        status: updated.status,
      };
      setForm(newData);
      setOriginal(newData);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    await approveUser(token, id);
    setForm({ ...form, status: 'active' });
    setOriginal({ ...original, status: 'active' });
  }

  async function handleReject() {
    if (!isAdmin) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    await rejectUser(token, id);
    setForm({ ...form, status: 'rejected' });
    setOriginal({ ...original, status: 'rejected' });
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!form) return <p className="text-sm text-red-600">{error}</p>;

  const activeItems =
    purchases?.filter((p) => p.status === 'active' || p.status === 'paused') || [];
  const endedPlanItems =
    purchases?.filter((p) => p.type === 'plan' && p.status === 'cancelled') || [];
  const hasActivePlan = activeItems.some((p) => p.status === 'active');

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

          {isAdmin && form.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                title="Aprobar"
                className="rounded-lg bg-[#a2c037]/15 p-1.5 text-[#4b7a1f] hover:bg-[#a2c037]/25"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleReject}
                title="Rechazar"
                className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </>
          )}
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
          <div className="rounded-xl bg-white p-6">
            {isAdmin && !editing && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                >
                  <Pencil size={13} />
                  Editar
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Apellidos</label>
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DateOfBirthPicker
                  value={form.dateOfBirth}
                  onChange={(value) => setForm({ ...form, dateOfBirth: value })}
                  disabled={!editing}
                />
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    disabled={!editing}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={!editing}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  disabled={!editing}
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              {isAdmin && editing && (
                <div className="mt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-lg bg-gray-100 px-5 py-2.5 font-semibold text-[#2b2b2a] hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {tab === 'progreso' && (
          <div className="rounded-xl bg-white p-6">
            <div className="mb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setProgressSubTab('hoy')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  progressSubTab === 'hoy'
                    ? 'bg-[#a2c037]/15 text-[#4b7a1f]'
                    : 'bg-gray-100 text-[#868585] hover:bg-gray-200'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setProgressSubTab('evolucion')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  progressSubTab === 'evolucion'
                    ? 'bg-[#a2c037]/15 text-[#4b7a1f]'
                    : 'bg-gray-100 text-[#868585] hover:bg-gray-200'
                }`}
              >
                Evolución
              </button>
            </div>

            {progressSubTab === 'hoy' ? (
              <form onSubmit={handleProgressSubmit} className="flex max-w-xl flex-col gap-4">
                <div className="max-w-[200px]">
                  <label className={labelClass}>Fecha</label>
                  <input
                    type="date"
                    value={progressForm.date}
                    onChange={(e) => setProgressField('date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {PROGRESS_METRICS.map((m) => (
                    <div key={m.key}>
                      <label className={labelClass}>
                        {m.label} {m.unit && `(${m.unit})`}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={(progressForm as any)[m.key]}
                        onChange={(e) => setProgressField(m.key as any, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>

                {progressError && (
                  <p className="text-sm font-medium text-red-600">{progressError}</p>
                )}
                {progressSaved && !progressError && (
                  <p className="text-sm font-medium text-[#4b7a1f]">Medición guardada.</p>
                )}

                <button
                  type="submit"
                  disabled={progressSaving}
                  className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {progressSaving ? 'Guardando...' : 'Guardar medición'}
                </button>
              </form>
            ) : progressEntries === null ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : progressEntries.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía no hay mediciones registradas.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {PROGRESS_METRICS.map((m) => {
                  const data = progressEntries.map((entry) => ({
                    date: new Date(entry.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                    }),
                    value: entry[m.key] ?? null,
                  }));
                  return (
                    <div key={m.key} className="rounded-lg border border-gray-100 p-4">
                      <p className="mb-2 text-xs font-semibold text-[#868585]">
                        {m.label} {m.unit && `(${m.unit})`}
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={data}>
                          <defs>
                            <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a2c037" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="#a2c037" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6aa842"
                            strokeWidth={2.5}
                            fill={`url(#grad-${m.key})`}
                            connectNulls
                            dot={{ r: 3, stroke: '#6aa842', strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'plan' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                  Plan
                </h3>
                <div className="flex gap-2">
                  {hasActivePlan ? (
                    <>
                      <button
                        onClick={() => openAssignPicker('punctual')}
                        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                        title="Plan con fecha de fin, que pausa el actual mientras dura"
                      >
                        Añadir plan puntual
                      </button>
                      <button
                        onClick={() => openAssignPicker('change')}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        title="Sustituye el plan activo por otro, de forma definitiva"
                      >
                        Cambiar plan
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openAssignPicker('new')}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Asignar plan
                    </button>
                  )}
                </div>
              </div>

              {purchases === null ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : activeItems.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Este cliente no tiene ningún plan o servicio activo.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeItems.map((item) => (
                    <div key={item._id} className="rounded-lg border border-gray-100 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#2b2b2a]">
                          {item.itemLabel}
                        </span>
                        {purchaseStatusBadge(item.status)}
                      </div>
                      <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[#868585]">
                        {item.scheduledEndDate ? 'Puntual' : 'Suscripción'}
                      </span>
                      <p className="text-lg font-bold text-[#4b7a1f]">
                        {item.price}€
                        {item.paymentMode === 'monthly' && (
                          <span className="text-xs font-normal text-[#868585]"> /mes</span>
                        )}
                      </p>
                      {item.sessionCount && (
                        <p className="text-xs text-[#868585]">
                          Bono de {item.sessionCount} sesiones
                        </p>
                      )}
                      {item.activatedAt && (
                        <p className="mt-1 text-xs text-[#868585]">
                          {item.status === 'paused' ? 'Empezó el' : 'Activo desde el'}{' '}
                          {new Date(item.activatedAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {item.status === 'paused' && (
                        <p className="mt-1 text-xs text-blue-700">
                          En pausa mientras dura un plan puntual. Se retoma solo al acabar.
                        </p>
                      )}
                      {item.scheduledEndDate && (
                        <p className="mt-1 text-xs text-[#868585]">
                          Puntual hasta el{' '}
                          {new Date(item.scheduledEndDate).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                      {item.assignedInPerson && (
                        <button
                          onClick={() => handleCancelPlan(item._id)}
                          disabled={cancellingId === item._id}
                          className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                        >
                          <Ban size={13} />
                          {cancellingId === item._id ? 'Parando...' : 'Parar plan'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {endedPlanItems.length > 0 && (
              <div className="rounded-xl bg-white p-6">
                <h3 className="mb-3 font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                  Planes anteriores
                </h3>
                <div className="flex flex-col gap-3">
                  {endedPlanItems.map((item) => (
                    <div key={item._id} className="rounded-lg border border-gray-100 p-4">
                      <span className="text-sm font-semibold text-[#2b2b2a]">
                        {item.itemLabel}
                      </span>
                      {item.activatedAt && item.endedAt && (
                        <p className="mt-1 text-xs text-[#868585]">
                          Fue del {formatDateTime(item.activatedAt)} al{' '}
                          {formatDateTime(item.endedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'historial' && (
          <div className="rounded-xl bg-white p-6">
            {purchases === null ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : purchases.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía no hay pagos registrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {buildHistoryEvents(purchases, `${form.firstName} ${form.lastName}`).map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-[#868585]">{formatDateTimeShort(ev.date)}</span>
                      {ev.author && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-[#868585]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: ev.authorColor }}
                          />
                          {ev.author}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#2b2b2a]">
                      <span className="font-semibold">{ev.itemLabel}</span> {ev.action}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setAssignModalOpen(false);
            setSelectedPlan(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {selectedPlan
                  ? assignMode === 'punctual'
                    ? 'Confirmar plan puntual'
                    : assignMode === 'change'
                      ? 'Confirmar cambio de plan'
                      : 'Confirmar plan'
                  : assignMode === 'punctual'
                    ? 'Plan puntual'
                    : assignMode === 'change'
                      ? 'Cambiar plan'
                      : 'Asignar plan'}
              </h3>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedPlan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {!selectedPlan ? (
              <div className="flex flex-col gap-6">
                {TRAINING_CATEGORIES.map((category) => (
                  <div key={category.id}>
                    <h4 className="mb-2 text-sm font-bold text-[#2b2b2a]">{category.title}</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {TRAINING_PLANS.filter((p) => p.category === category.id).map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => openAssignModal(plan)}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
                        >
                          <span className="flex items-center gap-1.5 text-[#2b2b2a]">
                            <Clock size={14} className="text-[#4b7a1f]" />
                            {plan.label}
                          </span>
                          <span className="font-bold text-[#4b7a1f]">
                            {plan.monthlyPrice}€<span className="font-normal text-[#868585]">/mes</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-[#2b2b2a]">{selectedPlan.label}</p>

                <div className="rounded-lg bg-[#f7f7f5] p-4">
                  <p className="text-lg font-bold text-[#4b7a1f]">
                    {selectedPlan.monthlyPrice}€
                    <span className="text-sm font-normal text-[#868585]"> /mes</span>
                  </p>
                  <p className="mt-1 text-xs text-[#868585]">
                    {assignMode === 'punctual'
                      ? 'Plan puntual: se paga en mano. Pausa el plan activo actual mientras dura, y lo retoma solo al llegar la fecha de fin.'
                      : assignMode === 'change'
                        ? 'Cambiar plan: se paga en mano. Sustituye el plan activo actual de forma definitiva, no se retoma.'
                        : 'Suscripción: se paga en mano, sigue activa hasta que se pare.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#868585]">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={assignStartDate}
                      onChange={(e) => setAssignStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                    />
                  </div>
                  {assignMode === 'punctual' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#868585]">
                        Fecha de fin
                      </label>
                      <input
                        type="date"
                        value={assignEndDate}
                        min={assignStartDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                      />
                    </div>
                  )}
                </div>

                {assignError && (
                  <p className="text-sm font-medium text-red-600">{assignError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAssignConfirm}
                    disabled={assignSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Check size={16} />
                    {assignSaving ? 'Asignando...' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}