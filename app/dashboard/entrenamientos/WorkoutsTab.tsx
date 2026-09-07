'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getWorkouts, deleteWorkout } from '@/lib/api';
import WorkoutFormModal from './WorkoutFormModal';
import WorkoutSummary from './WorkoutSummary';

export default function WorkoutsTab() {
  const [workouts, setWorkouts] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    load(token);
  }, []);

  function load(token: string) {
    getWorkouts(token)
      .then(setWorkouts)
      .catch(() => setError('No se pudieron cargar los entrenamientos'));
  }

  function openCreate() {
    setEditingWorkout(null);
    setModalOpen(true);
  }

  function openEdit(workout: any) {
    setEditingWorkout(workout);
    setModalOpen(true);
  }

  function handleSaved() {
    const token = localStorage.getItem('token');
    if (token) load(token);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteWorkout(token, id);
      load(token);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el entrenamiento');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex shrink-0 justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          Crear entrenamiento
        </button>
      </div>

      {error && <p className="mb-4 shrink-0 text-sm font-medium text-red-600">{error}</p>}

      {workouts === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay entrenamientos creados.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {workouts.map((w) => (
            <div key={w._id} className="rounded-xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                  {w.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(w)}
                    title="Editar"
                    className="rounded-lg bg-gray-100 p-1.5 text-[#2b2b2a] hover:bg-gray-200"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(w._id)}
                    title="Eliminar"
                    className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <WorkoutSummary slots={w.slots} />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <WorkoutFormModal
          editingWorkout={editingWorkout}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Eliminar entrenamiento
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === confirmDeleteId ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
