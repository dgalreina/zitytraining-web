'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createBookingOrQueue as createBooking,
  updateBookingOrQueue as updateBooking,
  deleteBookingOrQueue as deleteBooking,
  deleteBookingSeriesOrQueue as deleteBookingSeries,
} from '@/lib/offlineBookings';
import { getWorkouts } from '@/lib/workoutsApi';
import { createOwedSession, getPendingOwedCounts } from '@/lib/owedSessionsApi';
import { INTERVIEW_COLOR, PRIVATE_COLOR } from '@/lib/colors';
import { effectiveSlots } from '@/lib/workoutOverrides';
import type { ModalState } from './BookingModal';

export type BookingKind = 'normal' | 'private' | 'interview';

// Como texto, no número (igual que SetInput en ExerciseSlotInput): evita
// convertir ida y vuelta mientras se pintan.
export type WeightSlot = {
  exerciseId: string;
  exerciseName: string;
  category?: string;
  linkedToNext?: boolean;
  sets: { reps: string; weight: string }[];
};

export const KIND_OPTIONS: { value: BookingKind; label: string; color: string }[] = [
  { value: 'normal', label: 'Normal', color: '#6aa842' },
  { value: 'private', label: 'Privada', color: PRIVATE_COLOR },
  { value: 'interview', label: 'Entrevista', color: INTERVIEW_COLOR },
];

export type DurationOption = '40' | '50' | '60' | 'custom' | 'endTime';
export type ModalView = 'form' | 'notes' | 'training';

function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Todo el estado del formulario de crear/editar sesión; BookingModal y sus
// vistas solo leen de aquí.
export function useBookingForm(modal: ModalState, defaultTrainerId: string, onSaved: () => void) {
  const [start, setStart] = useState<Date>(() => modal?.start ?? new Date());
  const [modalTrainerId, setModalTrainerId] = useState('');
  // Hasta 3 clientes, sin un "principal".
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [durationOption, setDurationOption] = useState<DurationOption>('60');
  // Texto, no número: un input numérico controlado fuerza "0" al vaciarlo,
  // lo que impedía escribir p.ej. "70" sin que quedara "070".
  const [customMinutes, setCustomMinutes] = useState('60');
  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date(modal?.start ?? new Date());
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<ModalView>('form');
  const [status, setStatus] = useState<'active' | 'cancelled'>('active');
  // Privada y entrevista no llevan clientes y solo las ve quien las crea.
  const [kind, setKind] = useState<BookingKind>('normal');
  const isPrivate = kind !== 'normal';
  const kindColor = KIND_OPTIONS.find((o) => o.value === kind)!.color;
  // Solo se elige al crear; no se puede convertir en serie después.
  const [recurrence, setRecurrence] = useState<'once' | 'weekly'>('once');
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [holidaySkip, setHolidaySkip] = useState(false);
  // Recupera una clase debida de TODOS sus clientes a la vez (el grupo, no uno suelto).
  const [isDebtSettlement, setIsDebtSettlement] = useState(false);
  const [hasPendingOwed, setHasPendingOwed] = useState(false);
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false);
  const [deleteBookingDialogOpen, setDeleteBookingDialogOpen] = useState(false);
  // Confirmación con nuestro estilo (ver ConfirmDialog) en vez de
  // window.confirm; no se usa cuando ya hay otro diálogo haciendo de
  // confirmación (p.ej. elegir "esta sesión o toda la serie").
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(
    null,
  );

  function askConfirm(message: string, onConfirm: () => void) {
    setConfirmDialog({ message, onConfirm });
  }
  function resolveConfirm(confirmed: boolean) {
    const pending = confirmDialog;
    setConfirmDialog(null);
    if (confirmed) pending?.onConfirm();
  }

  // Igual que notas o clientes: queda en local hasta "Guardar". Uno nuevo
  // sí se crea ya de verdad en el catálogo, pero solo queda enganchado a
  // la sesión al guardar esta.
  const [bookingWorkout, setBookingWorkout] = useState<any | null>(null);
  const [workoutFormOpen, setWorkoutFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allWorkouts, setAllWorkouts] = useState<any[] | null>(null);
  const [workoutSearch, setWorkoutSearch] = useState('');
  // originalWorkoutIdRef guarda el que tenía al abrir el modal, para
  // saber si de verdad cambió (ver saveTrainingView).
  const [workoutSeriesChoiceOpen, setWorkoutSeriesChoiceOpen] = useState(false);
  const [applyWorkoutToSeries, setApplyWorkoutToSeries] = useState(false);
  const originalWorkoutIdRef = useRef<string | null>(null);

  // Pesos/reps reales de la sesión (no de la plantilla, ver
  // lib/workoutOverrides.ts). originalWeightOverridesRef solo vale para el
  // entrenamiento en weightOverrideWorkoutIdRef (se actualiza tras editar
  // desde el lápiz, ver handleWorkoutCreated, para que el useEffect de
  // abajo no lo pise). weightsEditedRef evita mandar weightOverrides si no
  // se tocó nada (si no, guardar solo una nota repropagaría el peso actual
  // a toda la serie).
  const [weightSlots, setWeightSlots] = useState<WeightSlot[]>([]);
  const weightOverrideWorkoutIdRef = useRef<string | null>(null);
  const originalWeightOverridesRef = useRef<any[] | undefined>(undefined);
  const weightsEditedRef = useRef(false);

  // Recarga el formulario desde cero cada vez que se abre o cambia lo editado.
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
    setDeleteBookingDialogOpen(false);
    setConfirmDialog(null);
    setRecurrence('once');
    setWorkoutSeriesChoiceOpen(false);
    setApplyWorkoutToSeries(false);
    weightsEditedRef.current = false;

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
      weightOverrideWorkoutIdRef.current = raw.workout?._id || null;
      originalWeightOverridesRef.current = raw.weightOverrides;
      setSeriesId(raw.series ? String(raw.series) : null);
      setHolidaySkip(!!raw.holidaySkip);
      setIsDebtSettlement(!!raw.isDebtSettlement);
      setEndTime(rawEnd);
      if (diff === 40) {
        setDurationOption('40');
      } else if (diff === 50) {
        setDurationOption('50');
      } else if (diff === 60) {
        setDurationOption('60');
      } else {
        setDurationOption('custom');
        setCustomMinutes(String(diff));
      }
    } else {
      // Punto de partida cómodo: tu usuario si eres entrenador, o el
      // primero marcado si eres admin; el selector siempre se muestra.
      originalWorkoutIdRef.current = null;
      weightOverrideWorkoutIdRef.current = null;
      originalWeightOverridesRef.current = undefined;
      setModalTrainerId(defaultTrainerId);
      setSelectedClientIds([]);
      setNotes('');
      setDurationOption('60');
      setCustomMinutes('60');
      setStatus('active');
      setKind('normal');
      setSeriesId(null);
      setHolidaySkip(false);
      setIsDebtSettlement(false);
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

  // Si ya no hay nada pendiente (p.ej. se quita al cliente al que se
  // debía), desmarca el interruptor para no mandar algo que ya no se ve.
  useEffect(() => {
    if (selectedClientIds.length === 0) {
      setHasPendingOwed(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    getPendingOwedCounts(token, selectedClientIds)
      .then((counts) => {
        if (cancelled) return;
        const any = selectedClientIds.some((id) => (counts[id] || 0) > 0);
        setHasPendingOwed(any);
        if (!any) setIsDebtSettlement(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedClientIds]);

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

  // weightOverrideSlots solo viene relleno cuando WorkoutFormModal se usó
  // en modo sesión (prop sessionMode) para editar pesos ya adjuntos.
  function handleWorkoutCreated(
    workout: any,
    weightOverrideSlots?: { exerciseId: string; sets: { reps?: number; weight?: number }[] }[],
  ) {
    if (weightOverrideSlots) {
      weightOverrideWorkoutIdRef.current = workout._id;
      originalWeightOverridesRef.current = weightOverrideSlots.map((s) => ({
        exercise: s.exerciseId,
        sets: s.sets,
      }));
      weightsEditedRef.current = true;
    }
    attachWorkout(workout);
    setWorkoutFormOpen(false);
  }

  function removeWorkout() {
    setBookingWorkout(null);
  }

  // Recalcula los pesos editables al cambiar el entrenamiento adjunto: si
  // es el mismo de al abrir el modal parte de sus overrides, si no, de la plantilla.
  useEffect(() => {
    if (!bookingWorkout) {
      setWeightSlots([]);
      return;
    }
    const overrides =
      bookingWorkout._id === weightOverrideWorkoutIdRef.current ? originalWeightOverridesRef.current : undefined;
    const merged = effectiveSlots(bookingWorkout.slots, overrides);
    setWeightSlots(
      merged
        // Descarta si el ejercicio viene sin poblar (rompería con key undefined).
        .filter((s) => s.exercise && s.exercise._id)
        .map((s) => ({
          exerciseId: s.exercise!._id,
          exerciseName: s.exercise!.name,
          category: s.exercise!.category,
          linkedToNext: s.linkedToNext,
          sets: (s.sets || []).map((set) => ({
            reps: set.reps != null ? String(set.reps) : '',
            weight: set.weight != null ? String(set.weight) : '',
          })),
        })),
    );
  }, [bookingWorkout]);

  // Notas y entrenamiento se editan en su propia pantalla: "Guardar" ahí
  // guarda la sesión entera y cierra el modal; "Atrás" descarta y vuelve
  // al valor de entrada, preguntando antes si de verdad hay cambios.
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
      askConfirm('¿Seguro que quieres salir sin guardar? Se perderán los cambios en la nota.', () => {
        setNotes(notesBackupRef.current);
        setView('form');
      });
      return;
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
    // Si es de una serie y el entrenamiento cambió, pregunta el alcance antes de guardar.
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
      askConfirm(
        '¿Seguro que quieres salir sin guardar? Se perderán los cambios en el entrenamiento.',
        () => {
          setBookingWorkout(workoutBackupRef.current);
          setPickerOpen(false);
          setView('form');
        },
      );
      return;
    }
    setBookingWorkout(workoutBackupRef.current);
    setPickerOpen(false);
    setView('form');
  }

  function getEffectiveDurationMinutes() {
    if (durationOption === '40') return 40;
    if (durationOption === '50') return 50;
    if (durationOption === '60') return 60;
    if (durationOption === 'endTime') return minutesBetween(start, endTime);
    return Number(customMinutes) || 0;
  }

  function handleStartTimeChange(date: Date | null) {
    if (!date) return;
    // Si el fin quedara antes del nuevo inicio, se desplaza con él (si no,
    // el picker de "Hora fin" queda fuera de su rango minTime=start).
    if (endTime.getTime() <= date.getTime()) {
      const durationMs = endTime.getTime() - start.getTime();
      setEndTime(new Date(date.getTime() + Math.max(durationMs, 5 * 60000)));
    }
    setStart(date);
  }

  function serializeWeightSlots(slots: WeightSlot[]) {
    return slots.map((s) => ({
      exerciseId: s.exerciseId,
      sets: s.sets
        .map((set) => ({
          reps: Number(set.reps) > 0 ? Number(set.reps) : undefined,
          weight: Number(set.weight) > 0 ? Number(set.weight) : undefined,
        }))
        .filter((set) => set.reps !== undefined || set.weight !== undefined),
    }));
  }

  // applyWorkoutToSeriesOverride evita leer el estado recién puesto
  // (setState es async) justo tras elegir el alcance en WorkoutSeriesChoiceDialog.
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
          isDebtSettlement: !isPrivate && isDebtSettlement ? true : undefined,
          ...(weightsEditedRef.current ? { weightOverrides: serializeWeightSlots(weightSlots) } : {}),
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
          // Solo tiene efecto si de verdad cambió el entrenamiento de una serie.
          applyWorkoutToSeries: applyWorkoutToSeriesOverride ?? applyWorkoutToSeries,
          ...(weightsEditedRef.current ? { weightOverrides: serializeWeightSlots(weightSlots) } : {}),
          // Solo tiene efecto si la sesión no era ya de una serie (si lo
          // era, BookingFormFields ni muestra el selector).
          recurrence,
          isDebtSettlement: !isPrivate && isDebtSettlement ? true : undefined,
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
    // Si es de una serie, elegir "esta" o "esta y las futuras" ya hace de
    // confirmación; si es suelta, hace falta la confirmación de abajo.
    if (seriesId) {
      setDeleteChoiceOpen(true);
      return;
    }
    setDeleteBookingDialogOpen(true);
  }

  // addOwed deja constancia de deuda para TODOS sus clientes (el grupo);
  // si falla para alguno no bloquea el borrado (se añade a mano después).
  async function handleDelete(addOwed = false) {
    if (modal!.mode !== 'edit') return;
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const bookingClients: { _id: string }[] = modal!.booking.clients || [];
      await deleteBooking(token, modal!.booking._id);
      if (addOwed) {
        for (const c of bookingClients) {
          try {
            await createOwedSession(token, c._id, 'Sesión borrada');
          } catch {
            // No pasa nada si esto falla para alguno: el borrado ya se hizo.
          }
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la sesión');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteBooking(addOwed: boolean) {
    setDeleteBookingDialogOpen(false);
    await handleDelete(addOwed);
  }

  // Borra esta sesión y las futuras de la serie; el pasado ya generado no se toca.
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

  // Cancelar no borra: la sesión queda visible, transparente y "CANCELADA"; reversible.
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
    isDebtSettlement,
    setIsDebtSettlement,
    hasPendingOwed,
    deleteChoiceOpen,
    setDeleteChoiceOpen,
    deleteBookingDialogOpen,
    setDeleteBookingDialogOpen,
    confirmDeleteBooking,
    confirmDialog,
    resolveConfirm,
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
    weightSlots,
    handleStartTimeChange,
    handleSave,
    handleDeleteClick,
    handleDelete,
    handleDeleteSeriesFrom,
    handleToggleCancelled,
  };
}
