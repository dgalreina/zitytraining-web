import { API_URL, apiFetch, handleResponse } from './apiClient';
//

// De dónde sale el importe del tramo: 1. el precio del plan entero, 2. el
// precio del plan entero más las sesiones de más que no entraban en su
// cupo semanal (cobradas como sueltas), 3. las sesiones dadas dentro del
// tramo, o 4. nada (no se cobró ese último mes).
export type AccountingSegmentBasis = 'full_month' | 'full_month_plus_extra' | 'sessions' | 'none';

export interface AccountingSegment {
  label: string;
  isFreeSessions: boolean;
  fromDay: number;
  toDay: number;
  amount: number;
  basis: AccountingSegmentBasis;
  // Con basis 'sessions': sesiones del tramo. Con 'full_month_plus_extra':
  // total de sesiones dadas (cupo + extra). En los demás casos, null.
  sessions: number | null;
  // Con basis 'sessions' o 'full_month_plus_extra'; en los demás, null.
  pricePerSession: number | null;
  // Sesiones de más sobre el cupo del plan, dadas de verdad. Por defecto
  // NO se cobran (extraAmount/chargedExtraSessions se quedan a 0): el
  // admin elige cuántas cobrar como sueltas.
  extraSessions: number | null;
  extraAmount: number | null;
  chargedExtraSessions: number | null;
  // Solo con basis 'full_month': cuántas sesiones faltaron para completar
  // el cupo del plan. No cambia lo que se cobra (el mes se cobra entero
  // igual), es solo para que se note en el desglose.
  missingSessions: number | null;
}

export interface AccountingDay {
  day: number;
  hasClass: boolean;
  holiday: boolean;
  // Cancelada, pero se cobra igual (se pinta aparte para que se note).
  cancelled: boolean;
  // Recupera una clase debida de este cliente: no cuenta ni se cobra.
  debtSettled: boolean;
}

export interface AccountingPayment {
  received: boolean;
  amountReceived: number | null;
}

export interface AccountingClientMonth {
  clientId: string;
  firstName: string;
  lastName: string;
  // Dado de baja o borrado: solo sale en los meses en los que dejó
  // sesiones dadas o dinero pendiente.
  inactive: boolean;
  segments: AccountingSegment[];
  days: AccountingDay[];
  sessionCount: number;
  // Canceladas que se cobraron igual (ver AccountingDay.cancelled); no
  // van incluidas en sessionCount.
  cancelledCount: number;
  due: number;
  payment: AccountingPayment;
}

export interface AccountingMonth {
  year: number;
  month: number;
  daysInMonth: number;
  clients: AccountingClientMonth[];
}

export async function getAccountingMonth(
  token: string,
  year: number,
  month: number,
): Promise<AccountingMonth> {
  const res = await apiFetch(`${API_URL}/accounting?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// Devuelve el cliente/mes entero recalculado (no solo el pago):
// chargedExtraSessions cambia lo que se cobra (amount, due, basis...).
export async function setAccountingPayment(
  token: string,
  clientId: string,
  year: number,
  month: number,
  data: { received: boolean; amountReceived?: number; chargedExtraSessions?: number },
): Promise<AccountingClientMonth> {
  const res = await apiFetch(`${API_URL}/accounting/${clientId}?year=${year}&month=${month}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
