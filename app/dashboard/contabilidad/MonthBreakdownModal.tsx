'use client';

import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { AccountingClientMonth, AccountingSegment, setAccountingPayment } from '@/lib/accountingApi';

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// Justifica el importe del tramo. Los días que abarca no lo explican
// cuando se cobra por sesiones: un tramo de 22 días puede ser 2 clases.
function billingDetail(seg: AccountingSegment) {
  if (seg.basis === 'none') return 'sin cobrar';
  if (seg.basis === 'sessions') {
    const n = seg.sessions ?? 0;
    return `${n} ${n === 1 ? 'sesión' : 'sesiones'} × ${seg.pricePerSession}€`;
  }
  return 'mes completo';
}

export default function MonthBreakdownModal({
  client,
  year,
  month,
  segmentColor,
  onClose,
  onSaved,
}: {
  client: AccountingClientMonth;
  year: number;
  month: number;
  segmentColor: (label: string, isFreeSessions: boolean) => string;
  onClose: () => void;
  onSaved: (payment: AccountingClientMonth['payment']) => void;
}) {
  const [received, setReceived] = useState(client.payment.received);
  const [amount, setAmount] = useState(
    client.payment.amountReceived != null ? String(client.payment.amountReceived) : String(client.due),
  );
  const [editingAmount, setEditingAmount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const amountNumber = Number(amount);
  const diff = Number.isFinite(amountNumber) ? Math.round((amountNumber - client.due) * 100) / 100 : 0;

  async function persist(nextReceived: boolean, nextAmount: string) {
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const parsed = Number(nextAmount);
      const payment = await setAccountingPayment(token, client.clientId, year, month, {
        received: nextReceived,
        amountReceived: Number.isFinite(parsed) ? parsed : undefined,
      });
      onSaved(payment);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-[family-name:var(--font-work-sans)] text-[15px] font-bold text-[#2b2b2a]">
              {client.firstName} {client.lastName}
            </p>
            <p className="mt-0.5 text-xs text-[#868585]">{monthLabel(year, month)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#868585]">Planes este mes</p>
          {client.segments.length === 0 ? (
            <p className="text-sm text-gray-400">Sin plan asignado este mes.</p>
          ) : (
            client.segments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: segmentColor(seg.label, seg.isFreeSessions) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#2b2b2a]">{seg.label}</p>
                  <p className="mt-0.5 text-xs text-[#868585]">
                    {seg.fromDay} – {seg.toDay} · {billingDetail(seg)}
                  </p>
                </div>
                <span className="font-[family-name:var(--font-work-sans)] text-sm font-bold text-[#4b7a1f]">
                  {seg.amount}€
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-[#f7f7f5] px-4 py-3">
          <div>
            <p className="text-xs text-[#868585]">Sesiones dadas</p>
            <p className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
              {client.sessionCount}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-right">
            <p className="text-xs text-[#868585]">Total a pagar</p>
            <p className="font-[family-name:var(--font-work-sans)] text-xl font-bold text-[#4b7a1f]">
              {client.due}€
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3.5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2b2b2a]">Recibido</p>
              <p className="mt-0.5 text-xs text-[#868585]">Marca cuando compruebes el ingreso</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={received}
              onClick={() => {
                const next = !received;
                setReceived(next);
                persist(next, amount);
              }}
              disabled={saving}
              className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
              style={{ backgroundColor: received ? '#6aa842' : '#d1d5db' }}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
                  received ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#2b2b2a]">Cantidad recibida</p>
              <p className="mt-0.5 text-xs text-[#868585]">Por si ha llegado de más o de menos</p>
            </div>
            <div className="flex items-center gap-2">
              {editingAmount ? (
                <input
                  type="number"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    setEditingAmount(false);
                    persist(received, amount);
                  }}
                  className="w-20 rounded-lg border border-[#6aa842] px-2 py-1.5 text-right text-sm font-bold text-[#2b2b2a] focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingAmount(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-bold text-[#2b2b2a] hover:border-[#6aa842]"
                >
                  {amount}€
                  <Pencil size={11} className="text-gray-400" />
                </button>
              )}
              {diff !== 0 && (
                <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {diff > 0 ? '+' : ''}
                  {diff}€
                </span>
              )}
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
