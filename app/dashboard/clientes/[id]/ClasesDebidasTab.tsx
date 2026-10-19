'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getOwedSessions, createOwedSession, deleteOwedSession, OwedSession } from '@/lib/owedSessionsApi';

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Lista plana de "le debemos una clase": añadir apunta una, quitar es la
// forma de darla por recuperada (no hay estado aparte, ver backend). Al
// marcar una sesión como "debida" al crearla, se quita sola la más
// antigua (ver BookingTrainingView/BookingFormFields del calendario).
export default function ClasesDebidasTab({ id }: { id: string }) {
  const [owed, setOwed] = useState<OwedSession[] | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function load(token: string) {
    getOwedSessions(token, id)
      .then(setOwed)
      .catch(() => setError('No se pudieron cargar las clases debidas'));
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    load(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdd() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAdding(true);
    setError('');
    try {
      await createOwedSession(token, id, note.trim() || undefined);
      setNote('');
      load(token);
    } catch (err: any) {
      setError(err.message || 'No se pudo añadir');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(owedId: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setRemovingId(owedId);
    setError('');
    try {
      await deleteOwedSession(token, owedId);
      load(token);
    } catch (err: any) {
      setError(err.message || 'No se pudo quitar');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-xl bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2b2b2a]">
            {owed === null ? 'Clases debidas' : `Debe ${owed.length} ${owed.length === 1 ? 'clase' : 'clases'}`}
          </p>
          <p className="mt-0.5 text-xs text-[#868585]">
            Quitar una de la lista es darla por recuperada.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Motivo (opcional)"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Plus size={16} />
          Añadir
        </button>
      </div>

      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

      {owed === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : owed.length === 0 ? (
        <p className="text-sm text-gray-400">No se le debe ninguna clase.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {owed.map((o) => (
            <div
              key={o._id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-[#2b2b2a]">{o.note || 'Sin motivo'}</p>
                <p className="mt-0.5 text-xs text-[#868585]">Desde el {formatDateShort(o.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(o._id)}
                disabled={removingId === o._id}
                title="Dar por recuperada"
                className="shrink-0 rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-60"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
