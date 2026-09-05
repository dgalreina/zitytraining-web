'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getProgressByClient, createProgressEntry } from '@/lib/api';
import { inputClass, labelClass } from './shared';

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

export default function ProgresoTab({ id }: { id: string }) {
  const [progressEntries, setProgressEntries] = useState<any[] | null>(null);
  const [progressSubTab, setProgressSubTab] = useState<'hoy' | 'evolucion'>('hoy');
  const [progressForm, setProgressForm] = useState(emptyProgressForm);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [progressSaved, setProgressSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getProgressByClient(token, id)
      .then(setProgressEntries)
      .catch(() => setProgressEntries([]));
  }, [id]);

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

  return (
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
  );
}
