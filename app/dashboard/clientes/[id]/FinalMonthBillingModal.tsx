'use client';

import { CalendarCheck, Scissors, Undo2 } from 'lucide-react';
import { FinalMonthBilling } from '@/lib/purchasesApi';

// Los planes mensuales no se prorratean por días: si se paran o se
// cambian a mitad de mes, el admin decide caso por caso cómo se factura
// ese mes concreto (de cara a Contabilidad más adelante).
export default function FinalMonthBillingModal({
  itemLabel,
  showNoChargeOption,
  onChoose,
  onClose,
}: {
  itemLabel: string;
  showNoChargeOption?: boolean;
  onChoose: (choice: FinalMonthBilling) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
          ¿Cómo se factura este mes?
        </h3>
        <p className="mb-4 text-sm text-[#868585]">
          <span className="font-semibold text-[#2b2b2a]">{itemLabel}</span> se para a mitad de
          mes. Elige cómo se cuenta este mes.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChoose('full_month')}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-[#2b2b2a] transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
          >
            <CalendarCheck size={16} className="shrink-0 text-[#4b7a1f]" />
            Cobrar el mes completo
          </button>
          <button
            onClick={() => onChoose('sessions')}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-[#2b2b2a] transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
          >
            <Scissors size={16} className="shrink-0 text-[#4b7a1f]" />
            Convertir este mes en sesiones sueltas
          </button>
          {showNoChargeOption && (
            <button
              onClick={() => onChoose('none')}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-[#2b2b2a] transition hover:border-[#6aa842] hover:bg-[#a2c037]/5"
            >
              <Undo2 size={16} className="shrink-0 text-[#4b7a1f]" />
              No cobrar nada (fue un error al elegir el plan)
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-gray-100 py-2 text-sm font-semibold text-[#2b2b2a] hover:bg-gray-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
