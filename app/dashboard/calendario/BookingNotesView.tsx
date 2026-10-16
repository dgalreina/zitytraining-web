'use client';

import { Trash2 } from 'lucide-react';

// Notas a pantalla completa (vista "notes"): más sitio para escribir que
// el textarea pequeño de la vista normal. El botón "Guardar" (en
// BookingModal) confirma el texto y vuelve al formulario; "Atrás" lo
// descarta y recupera lo que había antes de entrar aquí.
export default function BookingNotesView({
  notes,
  setNotes,
}: {
  notes: string;
  setNotes: (n: string) => void;
}) {
  return (
    <>
      <p className="mb-2 text-xs text-[#868585]">
        Pulsa Guardar para confirmar la nota, o Atrás para salir sin guardar los cambios.
      </p>
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
            onClick={() => setNotes('')}
            title="Borrar texto de la nota"
            className="rounded-lg bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </>
  );
}
