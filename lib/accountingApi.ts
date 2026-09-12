import { API_URL, apiFetch, handleResponse } from './apiClient';

// De dónde sale el importe del tramo: el precio del plan entero, las
// sesiones dadas dentro del tramo, o nada (no se cobró ese último mes).
export type AccountingSegmentBasis = 'full_month' | 'sessions' | 'none';

export interface AccountingSegment {
  label: string;
  isFreeSessions: boolean;
  fromDay: number;
  toDay: number;
  amount: number;
  basis: AccountingSegmentBasis;
  // Solo con basis 'sessions'; en los demás casos, null.
  sessions: number | null;
  pricePerSession: number | null;
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
