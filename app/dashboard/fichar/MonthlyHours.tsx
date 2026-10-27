'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsers } from '@/lib/usersApi';
import { getAllAttendance, AttendanceEntry } from '@/lib/attendanceApi';
import { sumHoursWorked, formatHoursWorked } from '@/lib/attendanceHours';

function monthLabel(year: number, month: number) {
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MonthlyHours() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[] | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    getUsers(token)
      .then((users) => setTrainers(users.filter((u: any) => u.roles?.includes('trainer') && u.status === 'active')))
      .catch(() => setTrainers([]));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    setEntries(null);
    getAllAttendance(token, monthStart.toISOString(), monthEnd.toISOString())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [year, month]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const hoursByTrainer = new Map<string, number>();
  if (entries) {
    for (const trainer of trainers) {
      const own = entries.filter((e) => {
        const trainerId = typeof e.trainer === 'string' ? e.trainer : e.trainer?._id;
        return trainerId === trainer._id;
      });
      hoursByTrainer.set(trainer._id, sumHoursWorked(own));
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
          Horas mensuales por entrenador
        </h3>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-gray-100"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="font-[family-name:var(--font-work-sans)] px-1 text-[13px] font-bold text-[#2b2b2a]">
            {monthLabel(year, month)}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-gray-100"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {trainers.length === 0 ? (
        <p className="text-sm text-gray-400">No hay entrenadores activos.</p>
      ) : entries === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-[#868585]">
                <th className="px-4 py-2.5">Entrenador</th>
                <th className="px-4 py-2.5 text-right">Horas este mes</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((trainer) => (
                <tr key={trainer._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[#2b2b2a]">
                    {trainer.firstName} {trainer.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#2b2b2a]">
                    {formatHoursWorked(hoursByTrainer.get(trainer._id) ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
