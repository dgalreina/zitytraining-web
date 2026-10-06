import { API_URL, apiFetch, handleResponse } from './apiClient';

// De dónde sale el importe del tramo: el precio del plan entero, el
// precio del plan entero más las sesiones de más que no entraban en su
// cupo semanal (cobradas como sueltas), las sesiones dadas dentro del
// tramo, o nada (no se cobró ese último mes).
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
  // Solo con basis 'full_month_plus_extra'.
  extraSessions: number | null;
  extraAmount: number | null;
}

export interface AccountingDay {
  day: number;
  hasClass: boolean;
  holiday: boolean;
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

export async function setAccountingPayment(
  token: string,
  clientId: string,
  year: number,
  month: number,
  data: { received: boolean; amountReceived?: number },
): Promise<AccountingPayment> {
  const res = await apiFetch(`${API_URL}/accounting/${clientId}?year=${year}&month=${month}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
