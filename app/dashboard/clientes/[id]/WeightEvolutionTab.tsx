'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getBookings, Booking } from '@/lib/bookingsApi';
import { effectiveSlots } from '@/lib/workoutOverrides';

const RANGE_MONTHS = 6;

type ExercisePoint = { date: string; weight: number | null; reps?: number };
type ExerciseHistory = { id: string; name: string; points: ExercisePoint[] };

// Top set: el peso más alto entre las series de ese ejercicio en esa
// sesión, convención habitual para seguir progresión de cargas.
function topSet(sets: { reps?: number; weight?: number }[]) {
  let best: { reps?: number; weight?: number } | null = null;
  for (const s of sets) {
    if (s.weight != null && (best?.weight == null || s.weight > best.weight)) best = s;
  }
  return best;
}

export default function WeightEvolutionTab({ id }: { id: string }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - RANGE_MONTHS, now.getDate());
    setBookings(null);
    getBookings(token, { client: id, from: from.toISOString(), to: now.toISOString() })
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [id]);

  const histories = useMemo<ExerciseHistory[]>(() => {
    if (!bookings) return [];
    const now = Date.now();
    const byExercise = new Map<string, ExerciseHistory>();
    const sorted = [...bookings]
      .filter((b) => b.status !== 'cancelled' && b.workout && new Date(b.startTime).getTime() <= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    for (const b of sorted) {
      const slots = effectiveSlots(b.workout!.slots, b.weightOverrides);
      const date = new Date(b.startTime).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      for (const slot of slots) {
        if (!slot.exercise) continue;
        const best = topSet(slot.sets || []);
        if (!best) continue;
        const entry = byExercise.get(slot.exercise._id) || {
          id: slot.exercise._id,
          name: slot.exercise.name,
          points: [],
        };
        entry.points.push({ date, weight: best.weight ?? null, reps: best.reps });
        byExercise.set(slot.exercise._id, entry);
      }
    }
    // Más reciente primero (más usado últimamente arriba en el selector).
    return Array.from(byExercise.values()).sort(
      (a, b) => b.points.length - a.points.length,
    );
  }, [bookings]);

  useEffect(() => {
    if (histories.length === 0) {
      setSelectedExerciseId('');
      return;
    }
    if (!histories.some((h) => h.id === selectedExerciseId)) {
      setSelectedExerciseId(histories[0].id);
    }
  }, [histories, selectedExerciseId]);

  const selected = histories.find((h) => h.id === selectedExerciseId);

  return (
    <div className="rounded-xl bg-white p-6">
      {bookings === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : histories.length === 0 ? (
        <p className="text-sm text-gray-400">
          Todavía no hay sesiones con pesos registrados en los últimos {RANGE_MONTHS} meses.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {histories.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedExerciseId(h.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedExerciseId === h.id
                    ? 'bg-[#a2c037]/15 text-[#4b7a1f]'
                    : 'bg-gray-100 text-[#868585] hover:bg-gray-200'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="mb-2 text-xs font-semibold text-[#868585]">{selected.name} (kg, top set)</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={selected.points}>
                  <defs>
                    <linearGradient id="grad-weight-evolution" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: any, _name: any, item: any) => [
                      `${value} kg${item?.payload?.reps ? ` × ${item.payload.reps} reps` : ''}`,
                      'Top set',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#6aa842"
                    strokeWidth={2.5}
                    fill="url(#grad-weight-evolution)"
                    connectNulls
                    dot={{ r: 3, stroke: '#6aa842', strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
