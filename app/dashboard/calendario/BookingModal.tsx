'use client';

import { useEffect, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';
import { X, Trash2 } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import { createBooking, updateBooking, deleteBooking } from '@/lib/api';

registerLocale('es', es);

export type ModalState =
  | { mode: 'create'; start: Date }
  | { mode: 'edit'; booking: any; start: Date }
  | null;

type DurationOption = '40' | '60' | 'custom';

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Modal de crear/editar sesión. Todo el estado del formulario vive aquí
// dentro; el padre solo decide QUÉ se está editando (o "nueva sesión" a
// partir de qué hora) a través de la prop `modal`, y se entera de cuándo
// hay que recargar y cerrar mediante `onSaved`.
export default function BookingModal({
  modal,
  trainers,
  clients,
  defaultTrainerId,
  onClose,
  onSaved,
}: {
  modal: ModalState;
  trainers: any[];
  clients: any[];
  defaultTrainerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState<Date>(() => modal?.start ?? new Date());
  const [modalTrainerId, setModalTrainerId] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>('60');
  const [customMinutes, setCustomMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Cada vez que se abre (o cambia lo que se está editando), recarga el
  // formulario desde cero a partir de esa sesión, o de los valores por
  // defecto si es una nueva.
  useEffect(() => {
    if (!modal) return;
    setStart(modal.start);
    setClientSearch('');
    setError('');

    if (modal.mode === 'edit') {
      const raw = modal.booking;
      const diff = minutesBetween(modal.start, new Date(raw.endTime));
      setModalTrainerId(raw.trainer?._id || raw.trainer || '');
      setSelectedClientIds(raw.clients.map((c: any) => c._id));
      setNotes(raw.notes || '');
      if (diff === 40) {
        setDurationOption('40');
      } else if (diff === 60) {
        setDurationOption('60');
      } else {
        setDurationOption('custom');
        setCustomMinutes(diff);
      }
    } else {
      // Preseleccionamos tu propio usuario si eres entrenador, o el primero
      // marcado en el checklist si eres admin puro; el selector siempre se
      // muestra, así que esto es solo un punto de partida cómodo.
      setModalTrainerId(defaultTrainerId);
      setSelectedClientIds([]);
      setNotes('');
      setDurationOption('60');
      setCustomMinutes(60);
    }
  }, [modal, defaultTrainerId]);

  if (!modal) return null;

  function toggleClient(id: string) {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function getEffectiveDurationMinutes() {
    if (durationOption === '40') return 40;
    if (durationOption === '60') return 60;
    return customMinutes;
  }

  function handleStartTimeChange(date: Date | null) {
    if (!date) return;
    setStart(date);
  }

  async function handleSave() {
    if (!modalTrainerId) {
      setError('Selecciona un entrenador');
      return;
    }
    if (selectedClientIds.length === 0) {
      setError('Selecciona al menos un cliente');
      return;
    }
    const duration = getEffectiveDurationMinutes();
    if (!duration || duration < 5) {
      setError('La duración debe ser de al menos 5 minutos');
      return;
    }

    const end = new Date(start.getTime() + duration * 60000);
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (modal!.mode === 'create') {
        await createBooking(token, {
          trainer: modalTrainerId,
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      } else {
        await updateBooking(token, (modal as { mode: 'edit'; booking: any }).booking._id, {
          trainer: modalTrainerId,
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (modal!.mode !== 'edit') return;
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await deleteBooking(token, modal!.booking._id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la sesión');
    } finally {
      setSaving(false);
    }
  }

  const filteredClients = clients.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
            {modal.mode === 'create' ? 'Nueva sesión' : 'Editar sesión'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-[#868585]">Entrenador</label>
          <FilterDropdown
            label="Elige un entrenador"
            options={trainers.map((t) => ({
              id: t._id,
              name: `${t.firstName} ${t.lastName}`,
              color: t.color,
            }))}
            value={modalTrainerId}
            onChange={setModalTrainerId}
            showColorDot
          />
        </div>

        <label className="mb-1 block text-xs font-semibold text-[#868585]">Hora de inicio</label>
        <DatePicker
          selected={start}
          onChange={handleStartTimeChange}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={5}
          timeCaption="Hora"
          dateFormat="HH:mm"
          locale="es"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
          wrapperClassName="mb-3 w-full block"
        />
        <p className="mb-3 text-xs text-[#868585]">
          {start.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>

        <label className="mb-1.5 block text-xs font-semibold text-[#868585]">Duración</label>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setDurationOption('40')}
            className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
              durationOption === '40'
                ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                : 'border-gray-200 text-[#868585] hover:bg-gray-50'
            }`}
          >
            40 min
          </button>
          <button
            type="button"
            onClick={() => setDurationOption('60')}
            className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
              durationOption === '60'
                ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                : 'border-gray-200 text-[#868585] hover:bg-gray-50'
            }`}
          >
            1 hora
          </button>
          <button
            type="button"
            onClick={() => setDurationOption('custom')}
            className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
              durationOption === 'custom'
                ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                : 'border-gray-200 text-[#868585] hover:bg-gray-50'
            }`}
          >
            Otra
          </button>
        </div>

        {durationOption === 'custom' && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-[#868585]">Minutos</label>
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
            />
          </div>
        )}

        <p className="mb-3 text-xs text-[#868585]">
          Termina a las{' '}
          {new Date(start.getTime() + getEffectiveDurationMinutes() * 60000).toLocaleTimeString(
            'es-ES',
            { hour: '2-digit', minute: '2-digit' },
          )}
        </p>

        <label className="mb-1 block text-xs font-semibold text-[#868585]">Clientes</label>
        {clients.length > 0 && (
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="mb-1.5 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#6aa842] focus:outline-none"
          />
        )}
        <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-1">
          {clients.length === 0 ? (
            <p className="p-2 text-xs text-gray-400">No hay clientes activos.</p>
          ) : filteredClients.length === 0 ? (
            <p className="p-2 text-xs text-gray-400">Sin resultados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-1">
              {filteredClients.map((c) => (
                <label
                  key={c._id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(c._id)}
                    onChange={() => toggleClient(c._id)}
                    className="shrink-0 accent-[#6aa842]"
                  />
                  <span className="truncate">
                    {c.firstName} {c.lastName}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="mb-1 block text-xs font-semibold text-[#868585]">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
        />

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {modal.mode === 'edit' && (
            <button
              onClick={handleDelete}
              disabled={saving}
              title="Eliminar sesión"
              className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
