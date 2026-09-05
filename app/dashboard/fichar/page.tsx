'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { clockIn, clockOut, getAttendanceStatus, getMyAttendance } from '@/lib/api';

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

export default function FicharPage() {
  const [status, setStatus] = useState<{ clockedIn: boolean; since?: string } | null>(null);
  const [entries, setEntries] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const router = useRouter();

  function load(token: string) {
    getAttendanceStatus(token).then(setStatus).catch(() => setStatus({ clockedIn: false }));
    getMyAttendance(token).then(setEntries).catch(() => setEntries([]));
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router]);

  // Para que el "llevas X" del que esta fichado se actualice solo.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleClockIn() {
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await clockIn(token);
      load(token);
    } catch (err: any) {
      setError(err.message || 'No se pudo fichar la entrada');
    } finally {
      setSaving(false);
    }
  }

  async function handleClockOut() {
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await clockOut(token);
      load(token);
    } catch (err: any) {
      setError(err.message || 'No se pudo fichar la salida');
    } finally {
      setSaving(false);
    }
  }

  const clockedIn = status?.clockedIn ?? false;

  return (
    <div className="max-w-2xl">
      <h2 className="mb-5 flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
        <Fingerprint size={20} />
        Fichar
      </h2>

      <div className="mb-4 rounded-xl bg-white p-6 text-center">
        {status === null ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : clockedIn ? (
          <>
            <p className="text-sm text-[#868585]">
              Fichado desde las <span className="font-semibold text-[#2b2b2a]">{formatTime(status.since!)}</span>
            </p>
            <p className="mb-5 text-2xl font-bold text-[#4b7a1f]">
              {formatDuration(now.getTime() - new Date(status.since!).getTime())}
            </p>
            <button
              onClick={handleClockOut}
              disabled={saving}
              className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <LogOut size={18} />
              {saving ? 'Fichando...' : 'Fichar salida'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-[#868585]">No estás fichado ahora mismo.</p>
            <button
              onClick={handleClockIn}
              disabled={saving}
              className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <LogIn size={18} />
              {saving ? 'Fichando...' : 'Fichar entrada'}
            </button>
          </>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl bg-white p-6">
        <h3 className="mb-3 font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
          Tus fichajes
        </h3>
        {entries === null ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no tienes fichajes registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div key={entry._id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#2b2b2a]">
                    {formatDate(entry.clockIn)}
                  </span>
                  {entry.clockOut && (
                    <span className="text-xs font-medium text-[#4b7a1f]">
                      {formatDuration(new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime())}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#868585]">
                  {formatTime(entry.clockIn)} – {entry.clockOut ? formatTime(entry.clockOut) : 'en curso'}
                </p>
                {entry.autoClockedOut && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle size={13} />
                    Cerrado automáticamente a las 22:00 (se olvidó fichar la salida)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
