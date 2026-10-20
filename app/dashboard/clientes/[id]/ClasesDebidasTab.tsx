'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getOwedSessions, createOwedSession, deleteOwedSession, OwedSession } from '@/lib/owedSessionsApi';

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Lista plana de "se le deben clases a este cliente": añadir apunta una.
// Marcar una sesión como "debida" al crearla (ver useBookingForm, en el
// calendario) deja constancia en recoveredNote de qué sesión la
// recuperó: es el único rastro de por qué esa sesión no se cobró, así
// que una ya recuperada no se puede borrar (lo rechaza el backend). Para
// que no se acumulen a la vista con los meses, se pliegan aparte.
export default function ClasesDebidasTab({ id }: { id: string }) {
  const [owed, setOwed] = useState<OwedSession[] | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showRecovered, setShowRecovered] = useState(false);

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

  const pending = owed?.filter((o) => !o.recoveredNote) ?? [];
  const recovered = owed?.filter((o) => o.recoveredNote) ?? [];

  function renderEntry(o: OwedSession, deletable: boolean) {
    return (
      <div
        key={o._id}
        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
      >
        <div className="min-w-0">
          <p className={`text-sm ${o.recoveredNote ? 'text-[#868585] line-through' : 'text-[#2b2b2a]'}`}>
            {o.note || 'Sin motivo'}
          </p>
          <p className="mt-0.5 text-xs text-[#868585]">Desde el {formatDateShort(o.createdAt)}</p>
          {o.recoveredNote && (
            <p className="mt-0.5 text-xs font-medium text-[#4b7a1f]">
              Recuperada: sesión del {o.recoveredNote}
            </p>
          )}
        </div>
        {deletable && (
          <button
            type="button"
            onClick={() => handleRemove(o._id)}
            disabled={removingId === o._id}
            title="Quitar de la lista"
            className="shrink-0 rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2b2b2a]">
            {owed === null ? 'Clases debidas' : `Se le ${pending.length === 1 ? 'debe' : 'deben'} ${pending.length} ${pending.length === 1 ? 'clase' : 'clases'}`}
          </p>
          <p className="mt-0.5 text-xs text-[#868585]">
            Al marcar una sesión como "debida" se deja constancia aquí; una vez recuperada ya no se puede borrar.
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
      ) : (
        <>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400">No tiene clases pendientes.</p>
          ) : (
            <div className="flex flex-col gap-2">{pending.map((o) => renderEntry(o, true))}</div>
          )}

          {recovered.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setShowRecovered((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-[#868585] hover:text-[#2b2b2a]"
              >
                {showRecovered ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showRecovered ? 'Ocultar' : 'Ver'} recuperadas ({recovered.length})
              </button>
              {showRecovered && (
                <div className="mt-2 flex flex-col gap-2">
                  {recovered.map((o) => renderEntry(o, false))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
