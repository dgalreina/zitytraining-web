import { API_URL, apiFetch, handleResponse } from './apiClient';
import { TrainingCategory } from './pricing';

export interface Plan {
  _id: string;
  category: TrainingCategory;
  label: string;
  sessionsPerWeek: number;
  durationMinutes: number;
  monthlyPrice: number;
  sessionCount: number;
  sessionPrice: number;
}

export interface PlanPayload {
  category: TrainingCategory;
  sessionsPerWeek: number;
  durationMinutes: number;
  monthlyPrice: number;
}

export async function getPlans(token: string): Promise<Plan[]> {
  const res = await apiFetch(`${API_URL}/plans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function createPlan(token: string, data: PlanPayload): Promise<Plan> {
  const res = await apiFetch(`${API_URL}/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updatePlan(token: string, id: string, data: PlanPayload): Promise<Plan> {
  const res = await apiFetch(`${API_URL}/plans/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deletePlan(token: string, id: string): Promise<Plan> {
  const res = await apiFetch(`${API_URL}/plans/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
