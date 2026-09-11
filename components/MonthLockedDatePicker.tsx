'use client';

import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shift, flip } from '@floating-ui/dom';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';

registerLocale('es', es);

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseLocalDate(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Selector de fecha que no deja salirse del mes de `monthOf` (ni
// navegar al mes siguiente/anterior): para planes puntuales, que no
// pueden cruzar de un mes a otro (precio único para todo su periodo).
export default function MonthLockedDatePicker({
  value,
  monthOf,
  onChange,
}: {
  value: string;
  monthOf: string;
  onChange: (value: string) => void;
}) {
  const anchor = parseLocalDate(monthOf);
  const minDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const maxDate = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  return (
    <DatePicker
      selected={value ? parseLocalDate(value) : null}
      onChange={(date: Date | null) => date && onChange(toDateString(date))}
      locale="es"
      calendarStartDay={1}
      dateFormat="dd/MM/yyyy"
      minDate={minDate}
      maxDate={maxDate}
      popperPlacement="bottom-start"
      popperModifiers={[shift({ padding: 8 }), flip({ padding: 8 })]}
      className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
      wrapperClassName="w-full"
      renderCustomHeader={({
        date,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => (
        <div className="ziti-dp-header">
          <button
            type="button"
            onClick={decreaseMonth}
            disabled={prevMonthButtonDisabled}
            className="ziti-dp-nav"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="ziti-dp-title">
            {capitalizeFirst(date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }))}
          </div>
          <button
            type="button"
            onClick={increaseMonth}
            disabled={nextMonthButtonDisabled}
            className="ziti-dp-nav"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    />
  );
}
