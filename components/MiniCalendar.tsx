'use client';

import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';

registerLocale('es', es);

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface MiniCalendarProps {
  selected: Date;
  onChange: (date: Date | null) => void;
  onMonthChange?: (date: Date) => void;
  daysWithBookings?: Set<string>;
}

export default function MiniCalendar({
  selected,
  onChange,
  onMonthChange,
  daysWithBookings,
}: MiniCalendarProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      onMonthChange={onMonthChange}
      locale="es"
      calendarStartDay={1}
      inline
      calendarClassName="ziti-mini-calendar"
      dayClassName={(date) => {
        const classes: string[] = [];
        if (daysWithBookings?.has(dayKey(date))) classes.push('ziti-has-booking');
        if (date.getDay() === 0 || date.getDay() === 6) classes.push('ziti-weekend');
        return classes.join(' ');
      }}
      renderCustomHeader={({
        date,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => (
        <div className="ziti-dp-header ziti-dp-header--mini">
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