'use client';

import type { Dispatch, SetStateAction } from 'react';
import DatePicker from 'react-datepicker';
import { Star, Repeat, CalendarOff } from 'lucide-react';
import FilterDropdown from '@/components/FilterDropdown';
import Switch from '@/components/Switch';
import { dayKey } from '@/components/MiniCalendar';
import { DurationOption, ModalView } from './useBookingForm';

// La vista principal del formulario de crear/editar sesión: entrenador,
// hora, duración, repetición (solo al crear), festivo, y clientes o nota
// según el tipo. Las otras dos vistas (notas a pantalla completa,
// entrenamiento) viven en sus propios componentes; el botón "Guardar" y
// los de cancelar/borrar se quedan en BookingModal, que es quien decide
// cuándo se pueden pulsar.
export default function BookingFormFields({
  mode,
  trainers,
  clients,
  holidaysByDate,
  isPrivate,
  modalTrainerId,
  setModalTrainerId,
  start,
  handleStartTimeChange,
  minStartTime,
  maxStartTime,
  durationOption,
  setDurationOption,
  endTime,
  setEndTime,
  maxEndTime,
  recurrence,
  setRecurrence,
  holidaySkip,
  setHolidaySkip,
  notes,
  setNotes,
  clientSearch,
  setClientSearch,
  filteredClients,
  selectedClientIds,
  toggleClient,
  setView,
  bookingWorkout,
}: {
  mode: 'create' | 'edit';
  trainers: any[];
  clients: any[];
  holidaysByDate: Record<string, string>;
  isPrivate: boolean;
  modalTrainerId: string;
  setModalTrainerId: (id: string) => void;
  start: Date;
  handleStartTimeChange: (date: Date | null) => void;
  minStartTime: Date;
  maxStartTime: Date;
  durationOption: DurationOption;
  setDurationOption: (d: DurationOption) => void;
  endTime: Date;
  setEndTime: Dispatch<SetStateAction<Date>>;
  maxEndTime: Date;
  recurrence: 'once' | 'weekly';
  setRecurrence: (r: 'once' | 'weekly') => void;
  holidaySkip: boolean;
  setHolidaySkip: Dispatch<SetStateAction<boolean>>;
  notes: string;
  setNotes: (n: string) => void;
  clientSearch: string;
  setClientSearch: (s: string) => void;
  filteredClients: any[];
  selectedClientIds: string[];
  toggleClient: (id: string) => void;
  setView: (v: ModalView) => void;
  bookingWorkout: any | null;
}) {
  return (
    <>
      {!isPrivate && (
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
      )}

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
        minTime={minStartTime}
        maxTime={maxStartTime}
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
          onClick={() => setDurationOption('endTime')}
          className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
            durationOption === 'endTime'
              ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
              : 'border-gray-200 text-[#868585] hover:bg-gray-50'
          }`}
        >
          Hora fin
        </button>
      </div>

      {durationOption === 'endTime' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-[#868585]">Termina a las</label>
          <DatePicker
            selected={endTime}
            onChange={(date: Date | null) => {
              if (date) setEndTime(date);
            }}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={5}
            timeCaption="Hora"
            dateFormat="HH:mm"
            locale="es"
            minTime={start}
            maxTime={maxEndTime}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
            wrapperClassName="mb-0 w-full block"
          />
        </div>
      )}

      {mode === 'create' && (
        <>
          <label className="mb-1.5 block text-xs font-semibold text-[#868585]">Repetición</label>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setRecurrence('once')}
              className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${
                recurrence === 'once'
                  ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                  : 'border-gray-200 text-[#868585] hover:bg-gray-50'
              }`}
            >
              Puntual
            </button>
            <button
              type="button"
              onClick={() => setRecurrence('weekly')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-sm font-semibold transition ${
                recurrence === 'weekly'
                  ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                  : 'border-gray-200 text-[#868585] hover:bg-gray-50'
              }`}
            >
              <Repeat size={14} />
              Cada semana
            </button>
          </div>
          {recurrence === 'weekly' && (
            <p className="mb-3 text-xs text-[#868585]">
              Se repite todas las semanas a esta misma hora, sin fecha de fin. Se puede parar más
              adelante desde cualquiera de sus sesiones.
            </p>
          )}
        </>
      )}

      {mode === 'edit' && holidaysByDate[dayKey(start)] && (
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#868585]">
            <CalendarOff size={14} />
            No cuenta como sesión dada (cae en {holidaysByDate[dayKey(start)]})
          </span>
          <Switch checked={holidaySkip} onChange={() => setHolidaySkip((v) => !v)} activeColor="#fa8072" size="sm" />
        </label>
      )}

      {isPrivate ? (
        <>
          <label className="mb-1 block text-xs font-semibold text-[#868585]">Nota</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Escribe aquí lo que quieras recordar..."
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
          />
        </>
      ) : (
        <>
          <label className="mb-1 block text-xs font-semibold text-[#868585]">Clientes (máximo 3)</label>
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
                {filteredClients.map((c) => {
                  const checked = selectedClientIds.includes(c._id);
                  const disabled = !checked && selectedClientIds.length >= 3;
                  return (
                    <label
                      key={c._id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleClient(c._id)}
                        className="shrink-0 accent-[#6aa842]"
                      />
                      {c.isFavorite && (
                        <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      <span className="truncate">
                        {c.firstName} {c.lastName}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className="mb-1.5 block text-xs font-semibold text-[#868585]">Más</label>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setView('notes')}
              className="relative flex-1 rounded-lg border border-gray-200 py-1.5 text-sm font-semibold text-[#868585] transition hover:bg-gray-50"
            >
              Notas
              {notes.trim() && (
                <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#6aa842]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setView('training')}
              className="relative flex-1 rounded-lg border border-gray-200 py-1.5 text-sm font-semibold text-[#868585] transition hover:bg-gray-50"
            >
              Entrenamiento
              {bookingWorkout && (
                <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#6aa842]" />
              )}
            </button>
          </div>
        </>
      )}
    </>
  );
}
