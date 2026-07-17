'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';
import '@/styles/fullcalendar-theme.css';
import { X, Trash2 } from 'lucide-react';
import MiniCalendar, { dayKey } from '@/components/MiniCalendar';
import {
  getActiveClients,
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
} from '@/lib/api';

registerLocale('es', es);

type ModalState =
  | { mode: 'create'; start: Date }
  | { mode: 'edit'; booking: any; start: Date }
  | null;

type DurationOption = '40' | '60' | 'custom';

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export default function MiCalendarioPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());
  const [clients, setClients] = useState<any[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>('60');
  const [customMinutes, setCustomMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [isTrainerView, setIsTrainerView] = useState(true);
  const [roleReady, setRoleReady] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    const { id, roles } = JSON.parse(storedUser);
    setUserId(id);

    const trainerView = roles?.includes('trainer') ?? false;
    setIsTrainerView(trainerView);
    setRoleReady(true);

    if (trainerView) {
      getActiveClients(token)
        .then(setClients)
        .catch(() => {});
    }
  }, [router]);

  function bookingToEvent(b: any) {
    let label = '';
    if (isTrainerView) {
      label = (b.clients || [])
        .map((c: any) => `${c.firstName} ${c.lastName?.[0] ?? ''}.`)
        .join(', ');
    } else {
      label = b.trainer ? `${b.trainer.firstName} ${b.trainer.lastName}` : 'Entrenador';
    }
    return {
      id: b._id,
      title: label || 'Sesión',
      start: b.startTime,
      end: b.endTime,
      extendedProps: { raw: b },
    };
  }

  async function loadBookings(fromStr: string, toStr: string) {
    const token = localStorage.getItem('token');
    if (!token || !userId) return;
    try {
      const params = isTrainerView
        ? { trainer: userId, from: fromStr, to: toStr }
        : { client: userId, from: fromStr, to: toStr };
      const data = await getBookings(token, params);
      setEvents(data.map(bookingToEvent));
    } catch {
      // silencioso: si falla, simplemente no se pintan eventos
    }
  }

  async function loadMonthDots(monthDate: Date) {
    const token = localStorage.getItem('token');
    if (!token || !userId) return;

    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    try {
      const params = isTrainerView
        ? { trainer: userId, from: start.toISOString(), to: end.toISOString() }
        : { client: userId, from: start.toISOString(), to: end.toISOString() };
      const data = await getBookings(token, params);
      const keys = new Set<string>(data.map((b: any) => dayKey(new Date(b.startTime))));
      setDaysWithBookings(keys);
    } catch {
      // silencioso
    }
  }

  function handleDatesSet(info: any) {
    loadBookings(info.startStr, info.endStr);
    setSelectedDate(info.view.currentStart);
  }

  useEffect(() => {
    if (userId && roleReady && calendarRef.current) {
      const api = calendarRef.current.getApi();
      loadBookings(
        api.view.activeStart.toISOString(),
        api.view.activeEnd.toISOString(),
      );
      loadMonthDots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roleReady]);

  function handleMiniDateChange(date: Date | null) {
    if (!date) return;
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  }

  function handleMiniMonthChange(date: Date) {
    loadMonthDots(date);
  }

  function openCreateModal(start: Date) {
    if (!isTrainerView) return;
    setModal({ mode: 'create', start });
    setSelectedClientIds([]);
    setNotes('');
    setDurationOption('60');
    setCustomMinutes(60);
    setError('');
  }

  function openEditModal(raw: any) {
    if (!isTrainerView) return;
    const start = new Date(raw.startTime);
    const end = new Date(raw.endTime);
    const diff = minutesBetween(start, end);

    setModal({ mode: 'edit', booking: raw, start });
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
    setError('');
  }

  function handleSelect(selectInfo: any) {
    openCreateModal(selectInfo.start);
    selectInfo.view.calendar.unselect();
  }

  function handleEventClick(clickInfo: any) {
    openEditModal(clickInfo.event.extendedProps.raw);
  }

  async function handleEventDrop(info: any) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateBooking(token, info.event.id, {
        startTime: info.event.start.toISOString(),
        endTime: info.event.end.toISOString(),
      });
      loadMonthDots(selectedDate);
    } catch (err: any) {
      alert(err.message || 'No se pudo mover la sesión');
      info.revert();
    }
  }

  async function handleEventResize(info: any) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await updateBooking(token, info.event.id, {
        startTime: info.event.start.toISOString(),
        endTime: info.event.end.toISOString(),
      });
    } catch (err: any) {
      alert(err.message || 'No se pudo redimensionar la sesión');
      info.revert();
    }
  }

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
    if (!modal || !date) return;
    setModal({ ...modal, start: date } as ModalState);
  }

  async function handleSaveModal() {
    if (!modal) return;

    if (selectedClientIds.length === 0) {
      setError('Selecciona al menos un cliente');
      return;
    }

    const duration = getEffectiveDurationMinutes();
    if (!duration || duration < 5) {
      setError('La duración debe ser de al menos 5 minutos');
      return;
    }

    const start = modal.start;
    const end = new Date(start.getTime() + duration * 60000);

    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (modal.mode === 'create') {
        await createBooking(token, {
          trainer: userId,
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      } else {
        await updateBooking(token, modal.booking._id, {
          clients: selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
        });
      }
      setModal(null);
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModal() {
    if (modal?.mode !== 'edit') return;
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await deleteBooking(token, modal.booking._id);
      setModal(null);
      const api = calendarRef.current?.getApi();
      if (api) {
        loadBookings(api.view.activeStart.toISOString(), api.view.activeEnd.toISOString());
      }
      loadMonthDots(selectedDate);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la sesión');
    } finally {
      setSaving(false);
    }
  }

  if (!roleReady) return null;

  return (
    <div className="flex h-[calc(100vh-130px)] gap-5">
      {/* Mini calendario lateral */}
      <div className="w-64 shrink-0 overflow-y-auto rounded-xl bg-white p-4">
        <MiniCalendar
          selected={selectedDate}
          onChange={handleMiniDateChange}
          onMonthChange={handleMiniMonthChange}
          daysWithBookings={daysWithBookings}
        />
      </div>

      {/* Calendario grande del día/semana */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-white p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          firstDay={1}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek' }}
          buttonText={{ today: 'Hoy', day: 'Día', week: 'Semana' }}
          locale="es"
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          height="100%"
          selectable={isTrainerView}
          editable={isTrainerView}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          events={events}
          eventColor="#6aa842"
          slotDuration="00:30:00"
          snapDuration="00:05:00"
          displayEventTime={false}
          eventContent={(arg) => {
            const raw = arg.event.extendedProps.raw;
            const start = arg.event.start;
            const end = arg.event.end;
            const timeStr =
              start && end
                ? `${start.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}–${end.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : '';
            return (
              <div className="ziti-event-box">
                <div className="ziti-event-time">{timeStr}</div>
                <div className="ziti-event-name">{arg.event.title}</div>
                {raw?.notes && <div className="ziti-event-tooltip">{raw.notes}</div>}
              </div>
            );
          }}
        />
      </div>

      {/* Modal crear/editar sesión (solo entrenador) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                {modal.mode === 'create' ? 'Nueva sesión' : 'Editar sesión'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <label className="mb-1 block text-xs font-semibold text-[#868585]">
              Hora de inicio
            </label>
            <DatePicker
              selected={modal.start}
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
              {modal.start.toLocaleDateString('es-ES', {
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
                <label className="mb-1 block text-xs font-semibold text-[#868585]">
                  Minutos
                </label>
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
              {new Date(modal.start.getTime() + getEffectiveDurationMinutes() * 60000).toLocaleTimeString(
                'es-ES',
                { hour: '2-digit', minute: '2-digit' },
              )}
            </p>

            <label className="mb-1 block text-xs font-semibold text-[#868585]">Clientes</label>
            <div className="mb-3 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-1">
              {clients.length === 0 ? (
                <p className="p-2 text-xs text-gray-400">No hay clientes activos.</p>
              ) : (
                clients.map((c) => (
                  <label
                    key={c._id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClientIds.includes(c._id)}
                      onChange={() => toggleClient(c._id)}
                      className="accent-[#6aa842]"
                    />
                    {c.firstName} {c.lastName}
                  </label>
                ))
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
                onClick={handleSaveModal}
                disabled={saving}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  onClick={handleDeleteModal}
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
      )}
    </div>
  );
}