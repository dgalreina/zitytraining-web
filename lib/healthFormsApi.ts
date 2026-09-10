import { API_URL, apiFetch, handleResponse } from './apiClient';

export interface HealthFormPayload {
  client?: string;
  dni?: string;
  height?: number;
  availableDaysCount?: number;
  availableDays?: string[];
  dailyActivityLevel?: string;
  occupationActivityLevel?: string;
  occupationWhich?: string;
  occupationHoursPerDay?: number;
  systematicSportPracticed?: boolean;
  systematicSportName?: string;
  systematicSportFrequency?: string;
  systematicSportDuration?: string;
  gymExperience?: boolean;
  gymExperienceDuration?: string;
  personalTrainerExperience?: boolean;
  personalTrainerStopReason?: string;
  currentActivity?: string;
  currentActivityFrequency?: string;
  dietControl?: boolean;
  wantsNutritionAdvice?: boolean;
  dietControlReason?: string;
  dietControlDescription?: string;
  alcoholFrequency?: string;
  smokingFrequency?: string;
  cigarettesPerDay?: number;
  cardiovascularCondition?: boolean;
  cardiovascularConditionWhich?: string;
  knowsCholesterol?: boolean;
  cholesterolTotal?: number;
  cholesterolHdl?: number;
  familyHistoryCoronary?: boolean;
  diabetes?: boolean;
  diabetesTimeSinceOnset?: string;
  respiratoryCondition?: boolean;
  respiratoryConditionWhich?: string;
  boneJointProblems?: boolean;
  boneJointProblemsWhichAndWhere?: string;
  spineDeviation?: string;
  pregnant?: boolean;
  pregnancyMonth?: string;
  menopause?: boolean;
  hormoneTherapy?: boolean;
  takesMedication?: boolean;
  medicationWhich?: string;
  objectives?: string[];
  otherConditions?: string;
  otherObservations?: string;
}

export interface HealthForm extends HealthFormPayload {
  _id: string;
  client: string;
}

export async function createHealthForm(token: string, data: HealthFormPayload): Promise<HealthForm> {
  const res = await apiFetch(`${API_URL}/health-forms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getHealthFormByClient(token: string, clientId: string): Promise<HealthForm | null> {
  const res = await apiFetch(`${API_URL}/health-forms/client/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateHealthForm(
  token: string,
  id: string,
  data: HealthFormPayload,
): Promise<HealthForm> {
  const res = await apiFetch(`${API_URL}/health-forms/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}
