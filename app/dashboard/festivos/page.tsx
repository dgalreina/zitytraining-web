'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, X, Check } from 'lucide-react';
import { getHolidays, createHoliday, resyncHolidays, deleteHoliday } from '@/lib/holidaysApi';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

function formatHolidayDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function FestivosPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  function load(token: string, y: number) {
    setHolidays(null);
    getHolidays(token, y)
      .then(setHolidays)
      .catch(() => {
        setError('No se pudieron cargar los festivos');
        setHolidays([]);
      });
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setError('');
    load(token, year);
  }, [router, year]);

  async function handleResync() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSyncing(true);
    try {
      const updated = await resyncHolidays(token, year);
      setHolidays(updated);
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar desde la API');
    } finally {
      setSyncing(false);
    }
  }

  function openAddModal() {
    setFormDate('');
    setFormName('');
    setFormError('');
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formDate || !formName.trim()) {
      setFormError('Rellena la fecha y el nombre');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setFormError('');
    try {
      await createHoliday(token, { date: formDate, name: formName.trim() });
      const newYear = Number(formDate.slice(0, 4));
      if (newYear !== year) {
        setYear(newYear);
      } else {
        load(token, year);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el festivo');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Seguro que quieres quitar este festivo?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteHoliday(token, id);
      setHolidays((prev) => (prev ? prev.filter((h) => h._id !== id) : prev));
    } catch (err: any) {
      setError(err.message || 'No se pudo quitar el festivo');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          <CalendarDays size={20} />
          Festivos
        </h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          Añadir festivo
        </button>
      </div>

      <p className="mb-4 text-xs text-[#868585]">
        Los nacionales y los de Castilla y León se traen solos de una API pública. Los locales de
        Valladolid no existen en ninguna API (los fija el ayuntamiento cada año), así que hay que
        añadirlos aquí a mano.
      </p>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-[#868585] hover:bg-gray-100 hover:text-[#2b2b2a]"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-[#2b2b2a]">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="rounded-lg p-1.5 text-[#868585] hover:bg-gray-100 hover:text-[#2b2b2a]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={handleResync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200 disabled:opacity-60"
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Actualizando...' : 'Actualizar festivos nacionales y de Castilla y León'}
        </button>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

      <div className="rounded-xl bg-white p-6">
        {holidays === null ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : holidays.length === 0 ? (
          <p className="text-sm text-gray-400">No hay festivos guardados para {year}.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {holidays.map((h) => (
              <div
                key={h._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <span className="text-sm font-semibold capitalize text-[#2b2b2a]">
                    {formatHolidayDate(h.date)}
                  </span>
                  <p className="text-xs text-[#868585]">{h.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      h.origin === 'manual'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-[#a2c037]/15 text-[#4b7a1f]'
                    }`}
                  >
                    {h.origin === 'manual' ? 'Local' : 'Automático'}
                  </span>
                  <button
                    onClick={() => handleDelete(h._id)}
                    disabled={deletingId === h._id}
                    title="Quitar festivo"
                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-60"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Añadir festivo local
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Fecha</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Feria y Fiestas de Valladolid"
                  className={inputClass}
                />
              </div>
              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? 'Guardando...' : 'Guardar festivo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
