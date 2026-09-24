'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, LogIn, LogOut, AlertTriangle, PenLine, X, Check, Pencil, Trash2 } from 'lucide-react';
import {
  clockIn,
  clockOut,
  getAttendanceStatus,
  getMyAttendance,
  createManualAttendance,
  updateAttendance,
  deleteAttendance,
} from '@/lib/attendanceApi';
import WeeklyAttendanceCalendar from './WeeklyAttendanceCalendar';

type Tab = 'mine' | 'calendar';

function tabButtonClass(active: boolean) {
  return `px-4 py-2.5 text-sm font-semibold transition ${
    active
      ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
      : 'text-[#868585] hover:text-[#2b2b2a]'
  }`;
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

export default function FicharPage() {
  const [tab, setTab] = useState<Tab>('mine');
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<{ clockedIn: boolean; since?: string } | null>(null);
  const [entries, setEntries] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [manualOpen, setManualOpen] = useState(false);
  const [manualMode, setManualMode] = useState<'full' | 'in' | 'out'>('full');
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function load(token: string) {
    getAttendanceStatus(token).then(setStatus).catch(() => setStatus({ clockedIn: false }));
    getMyAttendance(token).then(setEntries).catch(() => setEntries([]));
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsAdmin(storedUser ? JSON.parse(storedUser).roles?.includes('admin') : false);
    load(token);
  }, [router]);

  // Para que el "llevas X" del que esta fichado se actualice solo.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Igual que en Calendario: en vez de un numero fijo (que se desincroniza
  // en cuanto cambia algo por encima, como las pestañas de admin), se mide
  // cuanto ocupa lo que hay antes del bloque, para que "Tus fichajes"
  // ocupe justo lo que queda de pantalla y no la propia pagina.
  useEffect(() => {
    function recalcOffset() {
      const el = contentRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 24;
      setTopOffset(top + BOTTOM_GAP);
    }
    recalcOffset();
    window.addEventListener('resize', recalcOffset);
    return () => window.removeEventListener('resize', recalcOffset);
  }, [isAdmin, tab]);

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

  function closeManualModal() {
    setManualOpen(false);
    setManualMode('full');
    setManualDate('');
    setManualStart('');
    setManualEnd('');
    setManualError('');
  }

  async function handleCreateManual(e: React.FormEvent) {
    e.preventDefault();
    setManualError('');

    const needsStart = manualMode !== 'out';
    const needsEnd = manualMode !== 'in';
    if (!manualDate || (needsStart && !manualStart) || (needsEnd && !manualEnd)) {
      setManualError('Rellena la fecha y la hora');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setManualSaving(true);
    try {
      await createManualAttendance(token, {
        clockIn: needsStart ? `${manualDate}T${manualStart}` : undefined,
        clockOut: needsEnd ? `${manualDate}T${manualEnd}` : undefined,
      });
      closeManualModal();
      load(token);
    } catch (err: any) {
      setManualError(err.message || 'No se pudo guardar el fichaje manual');
    } finally {
      setManualSaving(false);
    }
  }

  function openEditModal(entry: any) {
    setEditingEntry(entry);
    setEditDate(toDateInputValue(new Date(entry.clockIn)));
    setEditStart(toTimeInputValue(new Date(entry.clockIn)));
    setEditEnd(entry.clockOut ? toTimeInputValue(new Date(entry.clockOut)) : '');
    setEditError('');
  }

  function closeEditModal() {
    setEditingEntry(null);
    setEditDate('');
    setEditStart('');
    setEditEnd('');
    setEditError('');
  }

  async function handleUpdateEntry(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');

    if (!editDate || !editStart) {
      setEditError('Rellena al menos la fecha y la hora de entrada');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setEditSaving(true);
    try {
      await updateAttendance(token, editingEntry._id, {
        clockIn: `${editDate}T${editStart}`,
        clockOut: editEnd ? `${editDate}T${editEnd}` : undefined,
      });
      closeEditModal();
      load(token);
    } catch (err: any) {
      setEditError(err.message || 'No se pudo guardar el fichaje');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteEntry(entry: any) {
    if (!window.confirm('¿Seguro que quieres borrar este fichaje? No se puede deshacer.')) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await deleteAttendance(token, entry._id);
      load(token);
    } catch (err: any) {
      setError(err.message || 'No se pudo borrar el fichaje');
    }
  }

  const clockedIn = status?.clockedIn ?? false;

  return (
    <div className={tab === 'calendar' ? 'max-w-4xl' : 'max-w-2xl'}>
      <h2 className="mb-5 flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
        <Fingerprint size={20} />
        Fichar
      </h2>

      {isAdmin && (
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          <button onClick={() => setTab('mine')} className={tabButtonClass(tab === 'mine')}>
            Mi fichaje
          </button>
          <button onClick={() => setTab('calendar')} className={tabButtonClass(tab === 'calendar')}>
            Calendario semanal
          </button>
        </div>
      )}

      <div
        ref={contentRef}
        className="flex flex-col gap-4"
        style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
      >
        {tab === 'calendar' ? (
          <WeeklyAttendanceCalendar />
        ) : (
          <>
            <div className="shrink-0 rounded-xl bg-white p-6 text-center">
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

            <button
              onClick={() => setManualOpen(true)}
              className="mx-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#868585] transition hover:text-[#4b7a1f]"
            >
              <PenLine size={14} />
              Añadir fichaje manual
            </button>

            <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white p-6">
              <h3 className="mb-3 shrink-0 font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                Tus fichajes
              </h3>
              {entries === null ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-gray-400">Todavía no tienes fichajes registrados.</p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {entries.map((entry) => (
                    <div key={entry._id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#2b2b2a]">
                          {formatDate(entry.clockIn)}
                          {entry.manual && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <PenLine size={10} />
                              Manual
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          {entry.clockOut && (
                            <span className="text-xs font-medium text-[#4b7a1f]">
                              {formatDuration(new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime())}
                            </span>
                          )}
                          <button
                            onClick={() => openEditModal(entry)}
                            aria-label="Editar fichaje"
                            className="text-[#868585] transition hover:text-[#4b7a1f]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            aria-label="Borrar fichaje"
                            className="text-[#868585] transition hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
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
          </>
        )}
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                Fichaje manual
              </h3>
              <button
                onClick={closeManualModal}
                className="text-[#868585] transition hover:text-[#2b2b2a]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-semibold">
              {(
                [
                  { key: 'full', label: 'Entrada y salida' },
                  { key: 'in', label: 'Solo entrada' },
                  { key: 'out', label: 'Solo salida' },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setManualMode(option.key)}
                  className={`flex-1 rounded-md px-2 py-1.5 transition ${
                    manualMode === option.key ? 'bg-white text-[#4b7a1f] shadow-sm' : 'text-[#868585]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleCreateManual} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-[#868585]">
                Fecha
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                />
              </label>
              <div className="flex gap-3">
                {manualMode !== 'out' && (
                  <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[#868585]">
                    Entrada
                    <input
                      type="time"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                    />
                  </label>
                )}
                {manualMode !== 'in' && (
                  <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[#868585]">
                    Salida
                    <input
                      type="time"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                    />
                  </label>
                )}
              </div>
              {manualError && <p className="text-sm font-medium text-red-600">{manualError}</p>}
              <button
                type="submit"
                disabled={manualSaving}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {manualSaving ? 'Guardando...' : 'Guardar fichaje'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                Editar fichaje
              </h3>
              <button
                onClick={closeEditModal}
                className="text-[#868585] transition hover:text-[#2b2b2a]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateEntry} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-[#868585]">
                Fecha
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[#868585]">
                  Entrada
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[#868585]">
                  Salida
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#2b2b2a]"
                  />
                </label>
              </div>
              {editError && <p className="text-sm font-medium text-red-600">{editError}</p>}
              <button
                type="submit"
                disabled={editSaving}
                className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
