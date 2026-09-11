'use client';

import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shift, flip } from '@floating-ui/dom';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';

registerLocale('es', es);

function parseMonthValue(value: string) {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Selector de mes y año (sin día): un desplegable propio en vez del
// <input type="month"> nativo, que en iOS Safari renderiza su control
// interno más ancho que la caja y no respeta overflow/max-width del
// contenedor (probado: sigue saliéndose incluso con CSS de contención).
export default function MonthYearPicker({
  value,
  minMonth,
  onChange,
}: {
  value: string; // 'yyyy-MM'
  minMonth?: string; // 'yyyy-MM'
  onChange: (value: string) => void;
}) {
  return (
    <DatePicker
      selected={value ? parseMonthValue(value) : null}
      onChange={(date: Date | null) => date && onChange(toMonthValue(date))}
      locale="es"
      dateFormat="MMMM 'de' yyyy"
      showMonthYearPicker
      minDate={minMonth ? parseMonthValue(minMonth) : undefined}
      popperPlacement="bottom-start"
      popperModifiers={[shift({ padding: 8 }), flip({ padding: 8 })]}
      className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20"
      wrapperClassName="w-full"
      renderCustomHeader={({ date, decreaseYear, increaseYear, prevYearButtonDisabled, nextYearButtonDisabled }) => (
        <div className="ziti-dp-header">
          <button
            type="button"
            onClick={decreaseYear}
            disabled={prevYearButtonDisabled}
            className="ziti-dp-nav"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="ziti-dp-title">{date.getFullYear()}</div>
          <button
            type="button"
            onClick={increaseYear}
            disabled={nextYearButtonDisabled}
            className="ziti-dp-nav"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    />
  );
}
