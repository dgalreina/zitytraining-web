export const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';

export const inputClassDisableable = `${inputClass} disabled:bg-gray-50 disabled:text-gray-500`;

export const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

// Caja de un interruptor (estado, permisos...) dentro de un formulario:
// fuera del modo edición se apaga igual que los campos de texto, para
// que se vea que no se puede tocar.
export function toggleBoxClass(editing: boolean) {
  return `flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 ${
    editing ? '' : 'bg-gray-50'
  }`;
}
