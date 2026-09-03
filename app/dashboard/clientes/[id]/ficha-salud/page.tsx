'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getUser, getHealthFormByClient, createHealthForm, updateHealthForm } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-[#2b2b2a] focus:border-[#6aa842] focus:outline-none focus:ring-2 focus:ring-[#a2c037]/20';
const labelClass = 'mb-1 block text-xs font-semibold text-[#868585]';

const WEEKDAYS = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentaria', label: 'Sedentaria' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'muy_alta', label: 'Muy alta' },
];

const OCCUPATION_LEVELS = [
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'poco_activa', label: 'Poco activa' },
  { value: 'activa', label: 'Activa' },
  { value: 'muy_activa', label: 'Muy activa' },
];

const HABIT_FREQUENCIES = [
  { value: 'nunca', label: 'Nunca' },
  { value: 'a_veces', label: 'A veces' },
  { value: 'a_menudo', label: 'A menudo (fines de semana)' },
  { value: 'a_diario', label: 'A diario' },
];

const SPINE_DEVIATIONS = [
  { value: 'no', label: 'No' },
  { value: 'escoliosis', label: 'Escoliosis' },
  { value: 'hipercifosis_toracica', label: 'Hipercifosis torácica' },
  { value: 'hiperlordosis_lumbar', label: 'Hiperlordosis lumbar' },
];

const emptyForm = {
  dni: '',
  height: '',
  availableDaysCount: '',
  availableDays: [] as string[],
  dailyActivityLevel: '',
  occupationActivityLevel: '',
  occupationWhich: '',
  occupationHoursPerDay: '',
  systematicSportPracticed: false,
  systematicSportName: '',
  systematicSportFrequency: '',
  systematicSportDuration: '',
  gymExperience: false,
  gymExperienceDuration: '',
  personalTrainerExperience: false,
  personalTrainerStopReason: '',
  currentActivity: '',
  currentActivityFrequency: '',
  dietControl: false,
  wantsNutritionAdvice: false,
  dietControlReason: '',
  dietControlDescription: '',
  alcoholFrequency: '',
  smokingFrequency: '',
  cigarettesPerDay: '',
  cardiovascularCondition: false,
  cardiovascularConditionWhich: '',
  knowsCholesterol: false,
  cholesterolTotal: '',
  cholesterolHdl: '',
  familyHistoryCoronary: false,
  diabetes: false,
  diabetesTimeSinceOnset: '',
  respiratoryCondition: false,
  respiratoryConditionWhich: '',
  boneJointProblems: false,
  boneJointProblemsWhichAndWhere: '',
  spineDeviation: 'no',
  pregnant: false,
  pregnancyMonth: '',
  menopause: false,
  hormoneTherapy: false,
  takesMedication: false,
  medicationWhich: '',
  objectives: ['', '', ''],
  otherConditions: '',
  otherObservations: '',
};

function segClass(active: boolean) {
  return `rounded-lg border px-4 py-1.5 text-sm font-semibold transition ${
    active
      ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
      : 'border-gray-200 text-[#868585] hover:bg-gray-50'
  }`;
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(false)} className={segClass(!value)}>
        No
      </button>
      <button type="button" onClick={() => onChange(true)} className={segClass(value)}>
        Sí
      </button>
    </div>
  );
}

function SegmentedSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={segClass(value === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 pb-6">
      <p className="mb-3 text-sm font-bold text-[#2b2b2a]">
        {number}. {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function FichaSaludPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formId, setFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([getUser(token, id), getHealthFormByClient(token, id)])
      .then(([user, existing]) => {
        setClientName(`${user.firstName} ${user.lastName}`);
        if (existing) {
          setFormId(existing._id);
          setForm({
            ...emptyForm,
            ...existing,
            dni: existing.dni || '',
            height: existing.height?.toString() || '',
            availableDaysCount: existing.availableDaysCount?.toString() || '',
            occupationHoursPerDay: existing.occupationHoursPerDay?.toString() || '',
            cigarettesPerDay: existing.cigarettesPerDay?.toString() || '',
            cholesterolTotal: existing.cholesterolTotal?.toString() || '',
            cholesterolHdl: existing.cholesterolHdl?.toString() || '',
            spineDeviation: existing.spineDeviation || 'no',
            objectives:
              existing.objectives?.length > 0 ? [...existing.objectives, '', '', ''].slice(0, 3) : ['', '', ''],
          });
        }
      })
      .catch(() => setError('No se pudo cargar la ficha'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
    setSaved(false);
  }

  function toNumberOrUndefined(value: string) {
    if (value.trim() === '') return undefined;
    const n = Number(value);
    return isNaN(n) ? undefined : n;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const payload = {
      ...form,
      height: toNumberOrUndefined(form.height),
      availableDaysCount: toNumberOrUndefined(form.availableDaysCount),
      occupationHoursPerDay: toNumberOrUndefined(form.occupationHoursPerDay),
      cigarettesPerDay: toNumberOrUndefined(form.cigarettesPerDay),
      cholesterolTotal: toNumberOrUndefined(form.cholesterolTotal),
      cholesterolHdl: toNumberOrUndefined(form.cholesterolHdl),
      objectives: form.objectives.filter((o) => o.trim() !== ''),
      dni: form.dni || undefined,
      // Los selectores empiezan en "" mientras no se tocan; el backend
      // valida contra el enum, y "" no es un valor válido (a diferencia
      // de un texto libre vacío, que sí pasa). Sin no rellenar = no
      // enviar, todo lo demás en el formulario sería obligatorio de facto.
      dailyActivityLevel: form.dailyActivityLevel || undefined,
      occupationActivityLevel: form.occupationActivityLevel || undefined,
      alcoholFrequency: form.alcoholFrequency || undefined,
      smokingFrequency: form.smokingFrequency || undefined,
    };

    try {
      if (formId) {
        await updateHealthForm(token, formId, payload);
      } else {
        const created = await createHealthForm(token, { ...payload, client: id });
        setFormId(created._id);
      }
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la ficha');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/clientes/${id}`}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#868585] hover:text-[#2b2b2a]"
      >
        <ArrowLeft size={16} />
        Volver al cliente
      </Link>

      <div className="rounded-xl bg-white p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
            Ficha de salud
          </h2>
        </div>
        <p className="mb-5 text-sm text-[#868585]">{clientName}</p>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-6">
            <div>
              <label className={labelClass}>D.N.I.</label>
              <input
                value={form.dni}
                onChange={(e) => set('dni', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Altura (cm)</label>
              <input
                type="number"
                value={form.height}
                onChange={(e) => set('height', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <Section number={1} title="Número de días de la semana disponibles para entrenar">
            <div className="max-w-[140px]">
              <label className={labelClass}>Nº días</label>
              <input
                type="number"
                min={0}
                max={7}
                value={form.availableDaysCount}
                onChange={(e) => set('availableDaysCount', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={segClass(form.availableDays.includes(d.value))}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Section>

          <Section number={2} title="¿Cómo calificarías tu actividad diaria?">
            <SegmentedSelect
              options={ACTIVITY_LEVELS}
              value={form.dailyActivityLevel}
              onChange={(v) => set('dailyActivityLevel', v)}
            />
          </Section>

          <Section number={3} title="¿Qué tipo de actividad laboral desarrollas? ¿Cuántas horas diarias trabajas?">
            <SegmentedSelect
              options={OCCUPATION_LEVELS}
              value={form.occupationActivityLevel}
              onChange={(v) => set('occupationActivityLevel', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>¿Cuál?</label>
                <input
                  value={form.occupationWhich}
                  onChange={(e) => set('occupationWhich', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horas</label>
                <input
                  type="number"
                  value={form.occupationHoursPerDay}
                  onChange={(e) => set('occupationHoursPerDay', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          <Section number={4} title="¿Ha practicado algún deporte de manera sistemática?">
            <YesNo
              value={form.systematicSportPracticed}
              onChange={(v) => set('systematicSportPracticed', v)}
            />
            {form.systematicSportPracticed && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>¿Qué deporte?</label>
                  <input
                    value={form.systematicSportName}
                    onChange={(e) => set('systematicSportName', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>¿Frecuencia semanal?</label>
                  <input
                    value={form.systematicSportFrequency}
                    onChange={(e) => set('systematicSportFrequency', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>¿Durante cuánto tiempo?</label>
                  <input
                    value={form.systematicSportDuration}
                    onChange={(e) => set('systematicSportDuration', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </Section>

          <Section number={5} title="¿Ha entrenado alguna vez en una sala de musculación?">
            <YesNo value={form.gymExperience} onChange={(v) => set('gymExperience', v)} />
            {form.gymExperience && (
              <div>
                <label className={labelClass}>¿Durante cuánto tiempo?</label>
                <input
                  value={form.gymExperienceDuration}
                  onChange={(e) => set('gymExperienceDuration', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section number={6} title="¿Ha entrenado alguna vez con un entrenador personal?">
            <YesNo
              value={form.personalTrainerExperience}
              onChange={(v) => set('personalTrainerExperience', v)}
            />
            {form.personalTrainerExperience && (
              <div>
                <label className={labelClass}>¿Por qué motivo dejaste de asistir?</label>
                <input
                  value={form.personalTrainerStopReason}
                  onChange={(e) => set('personalTrainerStopReason', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section
            number={7}
            title="¿Realizas actualmente alguna otra actividad física y/o deportiva? Indica cuál y con qué frecuencia"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Actividad</label>
                <input
                  value={form.currentActivity}
                  onChange={(e) => set('currentActivity', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Frecuencia</label>
                <input
                  value={form.currentActivityFrequency}
                  onChange={(e) => set('currentActivityFrequency', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </Section>

          <Section
            number={8}
            title="¿Realizas algún tipo de control dietético y/o suplementación alimentaria? ¿Por qué motivo?"
          >
            <YesNo value={form.dietControl} onChange={(v) => set('dietControl', v)} />
            <label className="flex items-center gap-2 text-sm text-[#2b2b2a]">
              <input
                type="checkbox"
                checked={form.wantsNutritionAdvice}
                onChange={(e) => set('wantsNutritionAdvice', e.target.checked)}
                className="accent-[#6aa842]"
              />
              Interesado en recibir consejos nutricionales
            </label>
            <div>
              <label className={labelClass}>Motivo (perder peso, aumentar masa muscular, problemas de salud, etc.)</label>
              <input
                value={form.dietControlReason}
                onChange={(e) => set('dietControlReason', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descríbelo brevemente</label>
              <textarea
                rows={2}
                value={form.dietControlDescription}
                onChange={(e) => set('dietControlDescription', e.target.value)}
                className={inputClass}
              />
            </div>
          </Section>

          <Section number={9} title="¿Con qué frecuencia ingieres bebidas alcohólicas?">
            <SegmentedSelect
              options={HABIT_FREQUENCIES}
              value={form.alcoholFrequency}
              onChange={(v) => set('alcoholFrequency', v)}
            />
          </Section>

          <Section number={10} title="¿Con qué frecuencia fumas?">
            <SegmentedSelect
              options={HABIT_FREQUENCIES}
              value={form.smokingFrequency}
              onChange={(v) => set('smokingFrequency', v)}
            />
            {form.smokingFrequency === 'a_diario' && (
              <div className="max-w-[200px]">
                <label className={labelClass}>¿Cuántos cigarrillos al día?</label>
                <input
                  type="number"
                  value={form.cigarettesPerDay}
                  onChange={(e) => set('cigarettesPerDay', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section
            number={11}
            title="¿Padece alguna patología leve del sistema cardiovascular (hipertensión, arritmias) o nota dolor en el pecho?"
          >
            <YesNo
              value={form.cardiovascularCondition}
              onChange={(v) => set('cardiovascularCondition', v)}
            />
            {form.cardiovascularCondition && (
              <div>
                <label className={labelClass}>¿Cuál?</label>
                <input
                  value={form.cardiovascularConditionWhich}
                  onChange={(e) => set('cardiovascularConditionWhich', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section number={12} title="¿Sabe qué nivel de colesterol total o HDL tiene en la actualidad?">
            <YesNo value={form.knowsCholesterol} onChange={(v) => set('knowsCholesterol', v)} />
            {form.knowsCholesterol && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Total (mg/dl)</label>
                  <input
                    type="number"
                    value={form.cholesterolTotal}
                    onChange={(e) => set('cholesterolTotal', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>HDL (mg/dl)</label>
                  <input
                    type="number"
                    value={form.cholesterolHdl}
                    onChange={(e) => set('cholesterolHdl', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </Section>

          <Section
            number={13}
            title="¿Tiene algún antecedente familiar de enfermedad coronaria (infartos u otras dolencias similares)?"
          >
            <YesNo
              value={form.familyHistoryCoronary}
              onChange={(v) => set('familyHistoryCoronary', v)}
            />
          </Section>

          <Section number={14} title="¿Tienes diabetes? ¿Desde hace cuánto?">
            <YesNo value={form.diabetes} onChange={(v) => set('diabetes', v)} />
            {form.diabetes && (
              <div>
                <label className={labelClass}>Tiempo de evolución</label>
                <input
                  value={form.diabetesTimeSinceOnset}
                  onChange={(e) => set('diabetesTimeSinceOnset', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section number={15} title="¿Padeces alguna afección respiratoria (asma, bronquitis, alergia)?">
            <YesNo
              value={form.respiratoryCondition}
              onChange={(v) => set('respiratoryCondition', v)}
            />
            {form.respiratoryCondition && (
              <div>
                <label className={labelClass}>¿Cuál?</label>
                <input
                  value={form.respiratoryConditionWhich}
                  onChange={(e) => set('respiratoryConditionWhich', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section
            number={16}
            title="¿Tienes problemas de huesos o articulaciones (artritis, artritis reumatoide, osteoporosis, condropatías, etc.)?"
          >
            <YesNo value={form.boneJointProblems} onChange={(v) => set('boneJointProblems', v)} />
            {form.boneJointProblems && (
              <div>
                <label className={labelClass}>¿Cuál y dónde?</label>
                <input
                  value={form.boneJointProblemsWhichAndWhere}
                  onChange={(e) => set('boneJointProblemsWhichAndWhere', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section number={17} title="¿Sufres algún tipo de desviación anómala de la columna?">
            <SegmentedSelect
              options={SPINE_DEVIATIONS}
              value={form.spineDeviation}
              onChange={(v) => set('spineDeviation', v)}
            />
          </Section>

          <Section number={18} title="En caso de ser mujer, ¿está usted embarazada?">
            <YesNo value={form.pregnant} onChange={(v) => set('pregnant', v)} />
            {form.pregnant && (
              <div className="max-w-xs">
                <label className={labelClass}>Mes de gestación</label>
                <input
                  value={form.pregnancyMonth}
                  onChange={(e) => set('pregnancyMonth', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section number={19} title="En caso de ser mujer, ¿le ha llegado la menopausia?">
            <YesNo value={form.menopause} onChange={(v) => set('menopause', v)} />
            {form.menopause && (
              <div>
                <label className={labelClass}>¿Está recibiendo terapia hormonal sustitutoria?</label>
                <YesNo value={form.hormoneTherapy} onChange={(v) => set('hormoneTherapy', v)} />
              </div>
            )}
          </Section>

          <Section number={20} title="¿Tomas algún tipo de medicamento que pueda afectar a tu rendimiento en la sala?">
            <YesNo value={form.takesMedication} onChange={(v) => set('takesMedication', v)} />
            {form.takesMedication && (
              <div>
                <label className={labelClass}>¿Cuál?</label>
                <input
                  value={form.medicationWhich}
                  onChange={(e) => set('medicationWhich', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </Section>

          <Section
            number={21}
            title="Objetivos que pretende conseguir con el entrenamiento, por orden de importancia"
          >
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                placeholder={`${i + 1}.`}
                value={form.objectives[i] || ''}
                onChange={(e) => {
                  const objectives = [...form.objectives];
                  objectives[i] = e.target.value;
                  set('objectives', objectives);
                }}
                className={inputClass}
              />
            ))}
          </Section>

          <Section
            number={22}
            title="Otro condicionante físico o psíquico que pueda impedir o entrañar riesgo en la práctica"
          >
            <textarea
              rows={3}
              value={form.otherConditions}
              onChange={(e) => set('otherConditions', e.target.value)}
              className={inputClass}
            />
          </Section>

          <Section number={23} title="Otras observaciones">
            <textarea
              rows={3}
              value={form.otherObservations}
              onChange={(e) => set('otherObservations', e.target.value)}
              className={inputClass}
            />
          </Section>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {saved && !error && (
            <p className="text-sm font-medium text-[#4b7a1f]">Ficha guardada correctamente.</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar ficha'}
            </button>
            <Link
              href={`/dashboard/clientes/${id}`}
              className="flex items-center justify-center rounded-lg bg-gray-100 px-5 py-2.5 font-semibold text-[#2b2b2a] hover:bg-gray-200"
            >
              {formId ? 'Volver' : 'Rellenar más tarde'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
