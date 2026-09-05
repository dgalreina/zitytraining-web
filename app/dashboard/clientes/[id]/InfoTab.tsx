'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import DateOfBirthPicker from '@/components/DateOfBirthPicker';
import { updateUser, deleteUser } from '@/lib/api';
import { inputClass, labelClass } from './shared';

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
      style={{ backgroundColor: checked ? '#6aa842' : '#d1d5db' }}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default function InfoTab({
  id,
  client,
  isAdmin,
  onClientUpdated,
}: {
  id: string;
  client: any;
  isAdmin: boolean;
  onClientUpdated: (updated: any) => void;
}) {
  const [draft, setDraft] = useState(client);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft({ ...draft, [e.target.name]: e.target.value });
  }

  function handleEdit() {
    setDraft(client);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(client);
    setError('');
    setEditing(false);
  }

  function handleToggleStatus() {
    setDraft({ ...draft, status: draft.status === 'active' ? 'inactive' : 'active' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const updated = await updateUser(token, id, {
        ...draft,
        email: draft.email || undefined,
      });
      const newData = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.split('T')[0] ?? '',
        email: updated.email || '',
        phone: updated.phone,
        address: updated.address,
        status: updated.status,
      };
      setDraft(newData);
      onClientUpdated(newData);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleting(true);
    try {
      await deleteUser(token, id);
      router.push('/dashboard/clientes');
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el cliente');
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl bg-white p-6">
        {isAdmin && !editing && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
            >
              <Pencil size={13} />
              Editar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                name="firstName"
                value={draft.firstName}
                onChange={handleChange}
                required
                disabled={!editing}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellidos</label>
              <input
                name="lastName"
                value={draft.lastName}
                onChange={handleChange}
                required
                disabled={!editing}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DateOfBirthPicker
              value={draft.dateOfBirth}
              onChange={(value) => setDraft({ ...draft, dateOfBirth: value })}
              disabled={!editing}
            />
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                name="phone"
                value={draft.phone}
                onChange={handleChange}
                required
                disabled={!editing}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              name="email"
              value={draft.email}
              onChange={handleChange}
              disabled={!editing}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Dirección</label>
            <input
              name="address"
              value={draft.address}
              onChange={handleChange}
              disabled={!editing}
              className={inputClass}
            />
          </div>

          {isAdmin && editing && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#2b2b2a]">
                  {draft.status === 'active' ? 'Cliente activo' : 'Cliente inhabilitado'}
                </p>
                <p className="text-xs text-[#868585]">
                  {draft.status === 'active'
                    ? 'El cliente aparece como activo en el gimnasio.'
                    : 'El cliente está inhabilitado.'}
                </p>
              </div>
              <Switch checked={draft.status === 'active'} onChange={handleToggleStatus} />
            </div>
          )}

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          {isAdmin && editing && (
            <div className="mt-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg bg-gray-100 px-5 py-2.5 font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          )}

          {isAdmin && editing && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center justify-center gap-1.5 self-start text-xs font-semibold text-red-600 hover:underline"
            >
              <Trash2 size={13} />
              Eliminar cliente
            </button>
          )}
        </form>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Eliminar cliente
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#868585]">
              {draft.firstName} dejará de aparecer en la lista de clientes. Su historial de
              planes y pagos no se borra, se queda guardado.
            </p>
            {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
