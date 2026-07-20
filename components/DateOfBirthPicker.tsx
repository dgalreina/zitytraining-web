'use client';

import { useEffect, useRef, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { shift, flip } from '@floating-ui/dom';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker-theme.css';

registerLocale('es', es);

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20 disabled:bg-gray-50 disabled:text-gray-500';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

interface DateOfBirthPickerProps {
  value: string; // 'yyyy-MM-dd' o cadena vacía
  onChange: (value: string) => void;
  disabled?: boolean;
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function YearMenu({ year, onSelect }: { year: number; onSelect: (y: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="ziti-dp-year-menu">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ziti-dp-year-trigger"
      >
        {year}
        <ChevronDown
          size={13}
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="ziti-dp-year-list">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onSelect(y);
                setOpen(false);
              }}
              className={`ziti-dp-year-option ${y === year ? 'ziti-dp-year-option--active' : ''}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DateOfBirthPicker({ value, onChange, disabled }: DateOfBirthPickerProps) {
  const selected = value ? new Date(value) : null;

  function handleChange(date: Date | null) {
    onChange(date ? date.toISOString().split('T')[0] : '');
  }

  return (
    <div>
      <label className={labelClass}>Fecha de nacimiento</label>
      <DatePicker
        selected={selected}
        onChange={handleChange}
        locale="es"
        calendarStartDay={1}
        dateFormat="dd/MM/yyyy"
        placeholderText="Selecciona una fecha"
        className={inputClass}
        wrapperClassName="w-full"
        disabled={disabled}
        required
        popperPlacement="bottom-start"
        popperModifiers={[shift({ padding: 8 }), flip({ padding: 8 })]}
        renderCustomHeader={({
          date,
          changeYear,
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
              <span>{capitalizeFirst(date.toLocaleDateString('es-ES', { month: 'long' }))}</span>
              <YearMenu year={date.getFullYear()} onSelect={changeYear} />
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
    </div>
  );
}