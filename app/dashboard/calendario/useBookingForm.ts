'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createBookingOrQueue as createBooking,
  updateBookingOrQueue as updateBooking,
  deleteBookingOrQueue as deleteBooking,
  deleteBookingSeriesOrQueue as deleteBookingSeries,
} from '@/lib/offlineBookings';
import { getWorkouts } from '@/lib/workoutsApi';
import { INTERVIEW_COLOR, PRIVATE_COLOR } from '@/lib/colors';
import type { ModalState } from './BookingModal';

export type BookingKind = 'normal' | 'private' | 'interview';

export const KIND_OPTIONS: { value: BookingKind; label: string; color: string }[] = [
  { value: 'normal', label: 'Normal', color: '#6aa842' },
  { value: 'private', label: 'Privada', color: PRIVATE_COLOR },
  { value: 'interview', label: 'Entrevista', color: INTERVIEW_COLOR },
];

export type DurationOption = '40' | '60' | 'custom' | 'endTime';
export type ModalView = 'form' | 'notes' | 'training';

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Todo el estado y la lógica del formulario de crear/editar sesión. El
// componente (BookingModal y sus vistas) solo lee de aquí y llama a estas
// funciones; no queda estado de formulario fuera de este hook.
export function useBookingForm(modal: ModalState, defaultTrainerId: string, onSaved: () => void) {
  const [start, setStart] = useState<Date>(() => modal?.start ?? new Date());
  const [modalTrainerId, setModalTrainerId] = useState('');
  // Hasta 3 clientes, sin distinguir uno "principal" de los demás.
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>('60');
  // Como texto, no numero: un input numerico controlado no deja vaciar
  // del todo el campo (React lo fuerza de vuelta a "0" antes del
  // siguiente tecleo), lo que impedia escribir p.ej. "70" sin que
  // quedara "070". Se convierte a numero solo donde hace falta.
  const [customMinutes, setCustomMinutes] = useState('60');
  // Hora de finalización cuando se elige la opción "endTime"
  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date(modal?.start ?? new Date());
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<ModalView>('form');
  const [status, setStatus] = useState<'active' | 'cancelled'>('active');
  // Normal (con clientes), privada (hueco personal del entrenador) o
  // entrevista (con alguien que aún no es cliente). Las dos últimas no
  // llevan clientes y solo las ve quien las crea.
  const [kind, setKind] = useState<BookingKind>('normal');
  const isPrivate = kind !== 'normal';
  const kindColor = KIND_OPTIONS.find((o) => o.value === kind)!.color;
  // Solo se elige al crear; una sesión ya creada no se puede convertir en
  // serie ni al revés desde aquí.
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('once');
  // Si esta sesión pertenece a una serie y cae en festivo.
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [holidaySkip, setHolidaySkip] = useState(false);
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false);

  // El entrenamiento es un campo mas del formulario: se queda en local
  // hasta que se pulsa "Guardar", igual que las notas o los clientes.
  // Al crear uno nuevo desde aqui si que se crea de verdad en el
  // catalogo (es un recurso aparte), pero solo queda "enganchado" a
  // esta sesion cuando se guarda la sesion.
  const [bookingWorkout, setBookingWorkout] = useState<any | null>(null);
  const [workoutFormOpen, setWorkoutFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allWorkouts, setAllWorkouts] = useState<any[] | null>(null);
  const [workoutSearch, setWorkoutSearch] = useState('');
  // Si esta sesión es de una serie y se cambia el entrenamiento, se
  // pregunta si aplicarlo solo aquí o también a las futuras (ver
  // saveTrainingView). originalWorkoutIdRef guarda el que tenía la
  // sesión al abrir el modal, para saber si de verdad ha cambiado.
  const [workoutSeriesChoiceOpen, setWorkoutSeriesChoiceOpen] = useState(false);
  const [applyWorkoutToSeries, setApplyWorkoutToSeries] = useState(false);
  const originalWorkoutIdRef = useRef<string | null>(null);

  // Cada vez que se abre (o cambia lo que se está editando), recarga el
  // formulario desde cero a partir de esa sesión, o de los valores por
  // defecto si es una nueva.
  useEffect(() => {
    if (!modal) return;
    setStart(modal.start);
    setClientSearch('');
    setError('');
    setView('form');
    setBookingWorkout(null);
    setPickerOpen(false);
    setWorkoutSearch('');
    setDeleteChoiceOpen(false);
    setRecurrence('once');
    setWorkoutSeriesChoiceOpen(false);
    setApplyWorkoutToSeries(false);

    if (modal.mode === 'edit') {
      const raw = modal.booking;
      const rawEnd = new Date(raw.endTime);
      const diff = minutesBetween(modal.start, rawEnd);
      setModalTrainerId(raw.trainer?._id || raw.trainer || '');
      setSelectedClientIds(raw.clients.map((c: any) => c._id));
      setNotes(raw.notes || '');
      setStatus(raw.status === 'cancelled' ? 'cancelled' : 'active');
      setKind(raw.isInterview ? 'interview' : raw.isPrivate ? 'private' : 'normal');
      setBookingWorkout(raw.workout || null);
      originalWorkoutIdRef.current = raw.workout?._id || null;
      setSeriesId(raw.series ? String(raw.series) : null);
      setHolidaySkip(!!raw.holidaySkip);
      setEndTime(rawEnd);
      if (diff === 40) {
        setDurationOption('40');
      } else if (diff === 60) {
        setDurationOption('60');
      } else {
        setDurationOption('custom');
        setCustomMinutes(String(diff));
      }
    } else {
      // Preseleccionamos tu propio usuario si eres entrenador, o el primero
      // marcado en el checklist si eres admin puro; el selector siempre se
      // muestra, así que esto es solo un punto de partida cómodo.
      originalWorkoutIdRef.current = null;
      setModalTrainerId(defaultTrainerId);
      setSelectedClientIds([]);
      setNotes('');
      setDurationOption('60');
      setCustomMinutes('60');
      setStatus('active');
      setKind('normal');
      setSeriesId(null);
      setHolidaySkip(false);
      const defaultEnd = new Date(modal.start);
      defaultEnd.setMinutes(defaultEnd.getMinutes() + 60);
      setEndTime(defaultEnd);
    }
  }, [modal, defaultTrainerId]);

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev; // máximo 3 clientes
      return [...prev, id];
    });
  }

  function openWorkoutPicker() {
    setPickerOpen(true);
    if (allWorkouts === null) {
      const token = localStorage.getItem('token');
      if (!token) return;
      getWorkouts(token)
        .then(setAllWorkouts)
        .catch(() => setAllWorkouts([]));
    }
  }

  function attachWorkout(workout: any) {
    setBookingWorkout(workout);
    setPickerOpen(false);
  }

  function handleWorkoutCreated(workout: any) {
    attachWorkout(workout);
    setWorkoutFormOpen(false);
  }

  function removeWorkout() {
    setBookingWorkout(null);
  }

  // Notas y entrenamiento se editan en su propia pantalla, aparte del
  // formulario principal: "Guardar" ahí guarda la sesión entera de
  // verdad (igual que el Guardar general) y cierra el modal, para no
  // obligar a confirmar dos veces. "Atrás" descarta el cambio y vuelve
  // al valor que había al entrar — pero si de verdad hay algo sin
  // guardar, antes se pregunta, para no perderlo con un solo toque.
  const notesBackupRef = useRef('');
  const workoutBackupRef = useRef<any | null>(null);

  function enterNotesView() {
    notesBackupRef.current = notes;
    setView('notes');
  }
  async function saveNotesView() {
    await handleSave();
  }
  function discardNotesView() {
    if (notes !== notesBackupRef.current) {
      if (!window.confirm('¿Seguro que quieres salir sin guardar? Se perderán los cambios en la nota.')) {
        return;
      }
    }
    setNotes(notesBackupRef.current);
    setView('form');
  }

  function enterTrainingView() {
    workoutBackupRef.current = bookingWorkout;
    setView('training');
  }
  async function saveTrainingView() {
    setPickerOpen(false);
    // Si la sesión es de una serie y el entrenamiento de verdad ha
    // cambiado respecto al que tenía al abrir el modal, se pregunta a
    // qué alcance aplicarlo antes de guardar de verdad.
    const changedFromOriginal = (bookingWorkout?._id ?? null) !== originalWorkoutIdRef.current;
    if (seriesId && changedFromOriginal) {
      setWorkoutSeriesChoiceOpen(true);
      return;
    }
    await handleSave();
  }
  async function confirmWorkoutScope(scope: 'single' | 'series') {
    setApplyWorkoutToSeries(scope === 'series');
    setWorkoutSeriesChoiceOpen(false);
    await handleSave(scope === 'series');
  }
  function cancelWorkoutScopeChoice() {
    // Se queda en la vista de Entrenamiento (no se decide nada todavía).
    setWorkoutSeriesChoiceOpen(false);
  }
  function discardTrainingView() {
    const changed = (bookingWorkout?._id ?? null) !== (workoutBackupRef.current?._id ?? null);
    if (changed) {
      if (
        !window.confirm('¿Seguro que quieres salir sin guardar? Se perderán los cambios en el entrenamiento.')
      ) {
        return;
      }
    }
    setBookingWorkout(workoutBackupRef.current);
    setPickerOpen(false);
    setView('form');
  }

  function getEffectiveDurationMinutes() {
    if (durationOption === '40') return 40;
    if (durationOption === '60') return 60;
    if (durationOption === 'endTime') return minutesBetween(start, endTime);
    return Number(customMinutes) || 0;
  }

  function handleStartTimeChange(date: Date | null) {
    if (!date) return;
    // Si la hora de fin quedara antes (o igual) que la nueva hora de
    // inicio, se desplaza con ella manteniendo la misma duración: si no,
    // el picker de "Hora fin" queda con un valor fuera de su propio
    // rango permitido (minTime=start) y se rompe al abrirlo.
    if (endTime.getTime() <= date.getTime()) {
      const durationMs = endTime.getTime() - start.getTime();
      setEndTime(new Date(date.getTime() + Math.max(durationMs, 5 * 60000)));
    }
    setStart(date);
  }

  // applyWorkoutToSeriesOverride: para llamar justo después de elegir el
  // alcance en WorkoutSeriesChoiceDialog, sin esperar al siguiente render
  // (setState es async, así que leer el estado aquí mismo podría ver
  // todavía el valor viejo).
  async function handleSave(applyWorkoutToSeriesOverride?: boolean) {
    if (!modalTrainerId) {
      setView('form');
      setError('Selecciona un entrenador');
      return;
    }
    // Una privada es solo tuya: no lleva clientes.
    if (!isPrivate && selectedClientIds.length === 0) {
      setView('form');
      setError('Selecciona al menos un cliente');
      return;
    }
    const duration = getEffectiveDurationMinutes();
    if (!duration || duration < 5) {
      setView('form');
      setError('La duración debe ser de al menos 5 minutos');
      return;
    }

    const end = durationOption === 'endTime' ? endTime : new Date(start.getTime() + duration * 60000);
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (modal!.mode === 'create') {
        await createBooking(token, {
          trainer: modalTrainerId,
          clients: isPrivate ? [] : selectedClientIds,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
          isPrivate,
          isInterview: kind === 'interview',
          workoutId: bookingWorkout?._id,
          recurrence,
        });
      } else {
        await updateBooking(token, (modal as { mode: 'edit'; booking: any }).booking._id, {
          trainer: modalTrainerId,
          clients: isPrivate ? [] : selectedClientIds,
          holidaySkip,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: notes || undefined,
          isPrivate,
          isInterview: kind === 'interview',
          workoutId: bookingWorkout?._id || null,
          // Solo tiene efecto si de verdad cambió el entrenamiento y la
          // sesión es de una serie (ver saveTrainingView).
          applyWorkoutToSeries: applyWorkoutToSeriesOverride ?? applyWorkoutToSeries,
          // Solo tiene efecto de verdad si la sesión no era ya parte de
          // una serie (ver BookingFormFields: el selector ni se muestra
          // en ese caso, así que aquí sigue siendo 'once').
          recurrence,
        });
      }
      onSaved();
    } catch (err: any) {
      setView('form');
      setError(err.message || 'No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick() {
    if (modal!.mode !== 'edit') return;
    // Si es de una serie, primero hay que preguntar si se borra solo esta
    // sesión o esta y todas las futuras (ver deleteChoiceOpen más abajo).
    if (seriesId) {
      setDeleteChoiceOpen(true);
      return;
    }
    handleDelete();
  }

  async function handleDelete() {
    if (modal!.mode !== 'edit') return;
    // A diferencia de cancelar (que se puede deshacer reactivando), borrar
    // es definitivo — y el botón está justo al lado del de cancelar, así
    // que un toque equivocado no debería destruir nada sin confirmar.
    if (!window.confirm('¿Seguro que quieres eliminar esta sesión? No se puede deshacer.')) {
      return;
    }
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

  // Borra esta sesión y todas las futuras de la serie; el pasado ya
  // generado no se toca, y la serie deja de generar sesiones a partir de
  // aquí.
  async function handleDeleteSeriesFrom() {
    if (modal!.mode !== 'edit') return;
    setDeleteChoiceOpen(false);
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await deleteBookingSeries(token, modal!.booking._id);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la serie');
    } finally {
      setSaving(false);
    }
  }

  // Cancelar es distinto de borrar: la sesión se queda (se ve en el
  // calendario, en su color pero transparente, con "CANCELADA"), solo
  // cambia de estado. Se puede revertir volviendo a marcarla como activa.
  async function handleToggleCancelled() {
    if (modal!.mode !== 'edit') return;
    const nextStatus = status === 'cancelled' ? 'active' : 'cancelled';
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await updateBooking(token, modal!.booking._id, { status: nextStatus });
      onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la sesión');
    } finally {
      setSaving(false);
    }
  }

  return {
    start,
    modalTrainerId,
    setModalTrainerId,
    selectedClientIds,
    toggleClient,
    clientSearch,
    setClientSearch,
    notes,
    setNotes,
    durationOption,
    setDurationOption,
    endTime,
    setEndTime,
    saving,
    error,
    view,
    enterNotesView,
    saveNotesView,
    discardNotesView,
    enterTrainingView,
    saveTrainingView,
    discardTrainingView,
    workoutSeriesChoiceOpen,
    confirmWorkoutScope,
    cancelWorkoutScopeChoice,
    status,
    kind,
    setKind,
    isPrivate,
    kindColor,
    recurrence,
    setRecurrence,
    seriesId,
    holidaySkip,
    setHolidaySkip,
    deleteChoiceOpen,
    setDeleteChoiceOpen,
    bookingWorkout,
    removeWorkout,
    workoutFormOpen,
    setWorkoutFormOpen,
    pickerOpen,
    setPickerOpen,
    allWorkouts,
    workoutSearch,
    setWorkoutSearch,
    openWorkoutPicker,
    attachWorkout,
    handleWorkoutCreated,
    handleStartTimeChange,
    handleSave,
    handleDeleteClick,
    handleDelete,
    handleDeleteSeriesFrom,
    handleToggleCancelled,
  };
}
