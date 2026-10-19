'use client';

import { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';
import { X, Trash2, ChevronLeft, ChevronDown, Ban, RotateCcw } from 'lucide-react';
import WorkoutFormModal from '../entrenamientos/WorkoutFormModal';
import BookingFormFields from './BookingFormFields';
import BookingNotesView from './BookingNotesView';
import BookingTrainingView from './BookingTrainingView';
import DeleteSeriesChoiceDialog from './DeleteSeriesChoiceDialog';
import DeleteBookingDialog from './DeleteBookingDialog';
import ConfirmDialog from './ConfirmDialog';
import WorkoutSeriesChoiceDialog from './WorkoutSeriesChoiceDialog';
import { useBookingForm, KIND_OPTIONS } from './useBookingForm';

registerLocale('es', es);

export type ModalState =
  | { mode: 'create'; start: Date }
  | { mode: 'edit'; booking: any; start: Date }
  | null;

// Modal de crear/editar sesión. Todo el estado del formulario vive en
// useBookingForm; este componente solo decide QUÉ vista mostrar (la
// cabecera, el formulario principal, notas a pantalla completa, o
// entrenamiento) y ensambla las piezas. El padre solo decide QUÉ se está
// editando (o "nueva sesión" a partir de qué hora) a través de la prop
// `modal`, y se entera de cuándo hay que recargar y cerrar mediante
// `onSaved`.
export default function BookingModal({
  modal,
  trainers,
  clients,
  defaultTrainerId,
  holidaysByDate,
  onClose,
  onSaved,
}: {
  modal: ModalState;
  trainers: any[];
  clients: any[];
  defaultTrainerId: string;
  holidaysByDate: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useBookingForm(modal, defaultTrainerId, onSaved);

  if (!modal) return null;

  const filteredClients = clients.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(form.clientSearch.trim().toLowerCase()),
  );
  const filteredWorkouts = (form.allWorkouts || []).filter((w) =>
    w.name.toLowerCase().includes(form.workoutSearch.trim().toLowerCase()),
  );

  // El centro cierra a las 22:00, pero a veces la sesión se alarga más
  // allá del cierre, así que se deja empezar hasta las 23:00.
  const minStartTime = new Date(form.start);
  minStartTime.setHours(7, 0, 0, 0);
  const maxStartTime = new Date(form.start);
  maxStartTime.setHours(23, 0, 0, 0);
  // react-datepicker exige minTime y maxTime juntos: el de "Hora fin" no
  // tiene un mínimo natural más que "después de empezar", así que se le
  // da el mismo margen que a la franja visible del calendario.
  const maxEndTime = new Date(form.start);
  maxEndTime.setHours(23, 59, 0, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            {form.view === 'form' ? (
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                  {modal.mode === 'create' ? 'Nueva sesión' : 'Editar sesión'}
                </h3>
                {form.status === 'cancelled' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Cancelada
                  </span>
                )}
                {/* Desplegable nativo del tamaño del antiguo switch, teñido
                    del color del tipo: el tipo se ve de un vistazo sin robar
                    una línea al formulario. Una cancelada es siempre normal
                    (las privadas se borran, no se cancelan): ahí no se enseña. */}
                {form.status !== 'cancelled' && (
                  <span className="relative ml-1 inline-flex items-center">
                    <select
                      value={form.kind}
                      onChange={(e) => form.setKind(e.target.value as typeof form.kind)}
                      aria-label="Tipo de sesión"
                      className="h-5 cursor-pointer appearance-none rounded-full border py-0 pl-2 pr-5 text-[11px] font-semibold focus:outline-none"
                      style={{
                        color: form.kindColor,
                        borderColor: form.kindColor,
                        backgroundColor: `${form.kindColor}1a`,
                      }}
                    >
                      {KIND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-1.5"
                      style={{ color: form.kindColor }}
                    />
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={form.view === 'notes' ? form.discardNotesView : form.discardTrainingView}
                className="flex items-center gap-1 font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]"
              >
                <ChevronLeft size={18} />
                {form.view === 'notes' ? 'Notas' : 'Entrenamiento'}
              </button>
            )}
            {form.view === 'form' && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            )}
          </div>

          {form.view === 'form' && (
            <BookingFormFields
              mode={modal.mode}
              canSetRecurrence={modal.mode === 'create' || !form.seriesId}
              trainers={trainers}
              clients={clients}
              holidaysByDate={holidaysByDate}
              isPrivate={form.isPrivate}
              modalTrainerId={form.modalTrainerId}
              setModalTrainerId={form.setModalTrainerId}
              start={form.start}
              handleStartTimeChange={form.handleStartTimeChange}
              minStartTime={minStartTime}
              maxStartTime={maxStartTime}
              durationOption={form.durationOption}
              setDurationOption={form.setDurationOption}
              endTime={form.endTime}
              setEndTime={form.setEndTime}
              maxEndTime={maxEndTime}
              recurrence={form.recurrence}
              setRecurrence={form.setRecurrence}
              holidaySkip={form.holidaySkip}
              setHolidaySkip={form.setHolidaySkip}
              notes={form.notes}
              setNotes={form.setNotes}
              clientSearch={form.clientSearch}
              setClientSearch={form.setClientSearch}
              filteredClients={filteredClients}
              selectedClientIds={form.selectedClientIds}
              toggleClient={form.toggleClient}
              onOpenNotes={form.enterNotesView}
              onOpenTraining={form.enterTrainingView}
              bookingWorkout={form.bookingWorkout}
              isDebtSettlement={form.isDebtSettlement}
              setIsDebtSettlement={form.setIsDebtSettlement}
              hasPendingOwed={form.hasPendingOwed}
            />
          )}

          {form.view === 'notes' && (
            <>
              <BookingNotesView notes={form.notes} setNotes={form.setNotes} />
              <button
                type="button"
                onClick={form.saveNotesView}
                disabled={form.saving}
                className="w-full rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {form.saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}

          {form.view === 'training' && (
            <>
              <BookingTrainingView
                bookingWorkout={form.bookingWorkout}
                removeWorkout={form.removeWorkout}
                pickerOpen={form.pickerOpen}
                setPickerOpen={form.setPickerOpen}
                workoutSearch={form.workoutSearch}
                setWorkoutSearch={form.setWorkoutSearch}
                allWorkouts={form.allWorkouts}
                filteredWorkouts={filteredWorkouts}
                attachWorkout={form.attachWorkout}
                setWorkoutFormOpen={form.setWorkoutFormOpen}
                openWorkoutPicker={form.openWorkoutPicker}
              />
              <button
                type="button"
                onClick={form.saveTrainingView}
                disabled={form.saving}
                className="w-full rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {form.saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}

          {form.view === 'form' && (
            <>
              {form.error && <p className="mb-3 text-sm font-medium text-red-600">{form.error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => form.handleSave()}
                  disabled={form.saving}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {form.saving ? 'Guardando...' : 'Guardar'}
                </button>
                {modal.mode === 'edit' && !form.isPrivate && (
                  <button
                    onClick={form.handleToggleCancelled}
                    disabled={form.saving}
                    title={form.status === 'cancelled' ? 'Reactivar sesión' : 'Cancelar sesión'}
                    className="rounded-lg bg-amber-50 px-3 py-2 text-amber-600 hover:bg-amber-100"
                  >
                    {form.status === 'cancelled' ? <RotateCcw size={16} /> : <Ban size={16} />}
                  </button>
                )}
                {modal.mode === 'edit' && (
                  <button
                    onClick={form.handleDeleteClick}
                    disabled={form.saving}
                    title="Eliminar sesión"
                    className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {form.workoutFormOpen && (
        <WorkoutFormModal
          editingWorkout={form.bookingWorkout}
          title={form.bookingWorkout ? undefined : 'Entrenamiento para esta sesión'}
          onClose={() => form.setWorkoutFormOpen(false)}
          onSaved={form.handleWorkoutCreated}
        />
      )}

      <ConfirmDialog
        open={!!form.confirmDialog}
        message={form.confirmDialog?.message ?? ''}
        danger
        confirmLabel="Sí, continuar"
        onConfirm={() => form.resolveConfirm(true)}
        onCancel={() => form.resolveConfirm(false)}
      />

      <DeleteSeriesChoiceDialog
        open={form.deleteChoiceOpen}
        clients={modal.mode === 'edit' ? modal.booking.clients || [] : []}
        onClose={() => form.setDeleteChoiceOpen(false)}
        onDeleteOnly={(addOwed) => {
          form.setDeleteChoiceOpen(false);
          form.handleDelete(addOwed);
        }}
        onDeleteSeriesFrom={form.handleDeleteSeriesFrom}
        saving={form.saving}
      />

      <WorkoutSeriesChoiceDialog
        open={form.workoutSeriesChoiceOpen}
        onCancel={form.cancelWorkoutScopeChoice}
        onApplyToThisOnly={() => form.confirmWorkoutScope('single')}
        onApplyToSeries={() => form.confirmWorkoutScope('series')}
        saving={form.saving}
      />

      <DeleteBookingDialog
        open={form.deleteBookingDialogOpen}
        clients={modal.mode === 'edit' ? modal.booking.clients || [] : []}
        onCancel={() => form.setDeleteBookingDialogOpen(false)}
        onConfirm={form.confirmDeleteBooking}
        saving={form.saving}
      />
    </>
  );
}
