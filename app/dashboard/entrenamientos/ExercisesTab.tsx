'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Lock, ChevronDown } from 'lucide-react';
import { getExercises, createExercise, updateExercise, deleteExercise } from '@/lib/api';
import { EXERCISE_CATEGORIES } from './exerciseCategories';

const DEFAULT_CATEGORY = EXERCISE_CATEGORIES[0].id;

export default function ExercisesTab() {
  const [exercises, setExercises] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    load(token);
  }, []);

  function load(token: string) {
    getExercises(token)
      .then(setExercises)
      .catch(() => setError('No se pudieron cargar los ejercicios'));
  }

  function openCreate() {
    setEditingId(null);
    setName('');
    setCategory(DEFAULT_CATEGORY);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(exercise: any) {
    setEditingId(exercise._id);
    setName(exercise.name);
    setCategory(exercise.category || DEFAULT_CATEGORY);
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Ponle un nombre al ejercicio');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateExercise(token, editingId, name.trim(), category);
      } else {
        await createExercise(token, name.trim(), category);
      }
      load(token);
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar el ejercicio');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteExercise(token, id);
      load(token);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el ejercicio');
    } finally {
      setDeletingId(null);
    }
  }

  const exercisesByCategory = (categoryId: string) =>
    (exercises || []).filter((ex) => (ex.category || 'otros') === categoryId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex shrink-0 justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          Crear ejercicio
        </button>
      </div>

      {error && <p className="mb-4 shrink-0 text-sm font-medium text-red-600">{error}</p>}

      {exercises === null ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : exercises.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay ejercicios en el catálogo.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {EXERCISE_CATEGORIES.map((cat) => {
            const items = exercisesByCategory(cat.id);
            if (items.length === 0) return null;
            const Icon = cat.icon;
            const isOpen = openCategory === cat.id;
            return (
              <div key={cat.id} className="rounded-xl bg-white p-4">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                  className="flex w-full items-center justify-between gap-2 px-1"
                >
                  <span className="flex items-center gap-2">
                    <Icon size={16} className="text-[#6aa842]" />
                    <h3 className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#2b2b2a]">
                      {cat.label}
                    </h3>
                    <span className="text-xs font-medium text-gray-400">({items.length})</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                <div className="mt-2 flex flex-col gap-1">
                  {items.map((ex) => (
                    <div
                      key={ex._id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-[#2b2b2a]">
                        {ex.name}
                        {ex.locked && (
                          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                            <Lock size={10} />
                            Predefinido
                          </span>
                        )}
                      </span>
                      {ex.locked ? (
                        <span title="No se puede editar ni eliminar" className="p-1.5 text-gray-300">
                          <Lock size={14} />
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(ex)}
                            title="Editar"
                            className="rounded-lg bg-gray-100 p-1.5 text-[#2b2b2a] hover:bg-gray-200"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(ex._id)}
                            title="Eliminar"
                            className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {editingId ? 'Editar ejercicio' : 'Nuevo ejercicio'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#868585]">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Press de banca"
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#868585]">Sección</label>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                          category === cat.id
                            ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                            : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={14} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Check size={16} />
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear ejercicio'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Eliminar ejercicio
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">
              Si algún entrenamiento ya lo usaba, ese ejercicio pasará a verse como eliminado en él.
            </p>
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
