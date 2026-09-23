'use client';

import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { shift, flip } from '@floating-ui/dom';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';

registerLocale('es', es);

// Disparador alternativo para cuando no hace falta el campo de texto
// completo (p. ej. junto a un selector de mes ya compacto): un simple
// icono que abre el mismo desplegable de mes/año.
const IconTrigger = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  (props, ref) => (
    <button
      type="button"
      ref={ref}
      {...props}
      aria-label="Ir a un mes concreto"
      title="Ir a un mes concreto"
      className="flex h-7 w-7 items-center justify-center rounded-full text-[#868585] hover:bg-gray-100"
    >
      <CalendarDays size={15} />
    </button>
  ),
);
IconTrigger.displayName = 'MonthYearPickerIconTrigger';

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
  trigger = 'input',
}: {
  value: string; // 'yyyy-MM'
  minMonth?: string; // 'yyyy-MM'
  onChange: (value: string) => void;
  trigger?: 'input' | 'icon';
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
      customInput={trigger === 'icon' ? <IconTrigger /> : undefined}
      className={
        trigger === 'input'
          ? 'w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20'
          : undefined
      }
      wrapperClassName={trigger === 'input' ? 'w-full' : undefined}
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
