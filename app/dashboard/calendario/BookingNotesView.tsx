'use client';

import { Trash2 } from 'lucide-react';
import { ModalView } from './useBookingForm';

// Notas a pantalla completa (vista "notes"): más sitio para escribir que
// el textarea pequeño de la vista normal. Solo borra el texto en el
// formulario; como el resto de cambios, hace falta pulsar Guardar para
// que se quede así de verdad en el servidor.
export default function BookingNotesView({
  notes,
  setNotes,
  setView,
}: {
  notes: string;
  setNotes: (n: string) => void;
  setView: (v: ModalView) => void;
}) {
  return (
    <>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={8}
        autoFocus
        placeholder="Escribe aquí cualquier detalle sobre la sesión..."
        className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#6aa842] focus:outline-none"
      />
      {notes.trim() && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setNotes('');
              setView('form');
            }}
            title="Borrar nota"
            className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </>
  );
}
