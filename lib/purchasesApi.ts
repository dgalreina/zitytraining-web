import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface PurchaseActorRef {
  firstName?: string;
  lastName?: string;
  color?: string;
}

// Cómo se factura el mes en el que un plan mensual se para o se cambia a
// mitad de mes (los mensuales no se prorratean por días). Ver purchases.schema.ts.
export type FinalMonthBilling = 'full_month' | 'sessions';

export interface Purchase {
  _id: string;
  client: string;
  itemId?: string;
  itemLabel: string;
  type?: 'plan' | 'service';
  paymentMode?: 'monthly' | 'sessions' | 'one_time';
  price: number;
  sessionCount?: number;
  startDate?: string;
  scheduledEndDate?: string;
  activatedAt?: string;
  pausedPlan?: string;
  createdAt: string;
  createdBy?: PurchaseActorRef;
  assignedInPerson?: boolean;
  endedAt?: string;
  endedBy?: PurchaseActorRef;
  endReason?: 'changed' | 'cancelled';
  replacedByLabel?: string;
  finalMonthBilling?: FinalMonthBilling;
}

export interface CreatePurchasePayload {
  type: 'plan' | 'service';
  itemId: string;
  itemLabel: string;
  paymentMode: 'monthly' | 'sessions' | 'one_time';
  price: number;
  sessionCount?: number;
}

export interface AssignPlanPayload {
  client: string;
  itemId: string;
  itemLabel: string;
  price: number;
  sessionCount?: number;
  startDate: string;
  // Solo para changePlan: cómo se factura, para el plan que se sustituye,
  // el mes a mitad del que se hace el cambio.
  finalMonthBilling?: FinalMonthBilling;
}

export interface AssignPunctualPlanPayload extends AssignPlanPayload {
  endDate: string;
}

export async function createPurchase(token: string, data: CreatePurchasePayload): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function createCheckoutSession(
  token: string,
  purchaseId: string,
): Promise<{ url: string }> {
  const res = await apiFetch(`${API_URL}/purchases/${purchaseId}/checkout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getMyPurchases(token: string): Promise<Purchase[]> {
  const res = await apiFetch(`${API_URL}/purchases/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function getClientPurchases(token: string, clientId: string): Promise<Purchase[]> {
  const res = await apiFetch(`${API_URL}/purchases/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function assignPlan(token: string, data: AssignPlanPayload): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function assignPunctualPlan(
  token: string,
  data: AssignPunctualPlanPayload,
): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases/assign-punctual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function changePlan(token: string, data: AssignPlanPayload): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function cancelPurchase(
  token: string,
  purchaseId: string,
  finalMonthBilling?: FinalMonthBilling,
): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases/${purchaseId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ finalMonthBilling }),
  });
  return handleResponse(res);
}

export async function updatePurchaseDates(
  token: string,
  purchaseId: string,
  data: { startDate?: string; endDate?: string },
): Promise<Purchase> {
  const res = await apiFetch(`${API_URL}/purchases/${purchaseId}/dates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
