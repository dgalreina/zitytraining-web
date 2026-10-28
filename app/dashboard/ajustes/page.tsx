'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { getMe, updateMe } from '@/lib/usersApi';
import { inputClass, labelClass } from '@/lib/formStyles';
import { DEFAULT_REMINDER_TEMPLATE, renderRecordatorio } from '@/lib/reminderTemplate';

// Ejemplos fijos (no dependen de datos reales) para la vista previa: uno
// con una sola sesión esa semana y otro con dos, que es justo lo que
// distingue cómo se expande {fecha} (ver lib/reminderTemplate.ts).
function ejemplos() {
  const base = new Date();
  base.setHours(10, 0, 0, 0);
  base.setDate(base.getDate() + ((1 + 7 - base.getDay()) % 7 || 7)); // próximo lunes
  const lunes10 = new Date(base);
  const lunes11 = new Date(base.getTime() + 60 * 60000);
  const miercoles = new Date(base);
  miercoles.setDate(miercoles.getDate() + 2);
  miercoles.setHours(18, 30, 0, 0);
  const miercolesFin = new Date(miercoles.getTime() + 45 * 60000);

  return {
    unaSesion: [{ start: lunes10, end: lunes11 }],
    variasSesiones: [
      { start: lunes10, end: lunes11 },
      { start: miercoles, end: miercolesFin },
    ],
  };
}

export default function AjustesPage() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { unaSesion, variasSesiones } = useMemo(ejemplos, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getMe(token)
      .then((user) => {
        if (!user.roles?.includes('trainer')) {
          router.push('/dashboard');
          return;
        }
        setTemplate(user.defaultReminderMessage || DEFAULT_REMINDER_TEMPLATE);
      })
      .catch(() => setError('No se pudo cargar tus ajustes'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSaved(false);

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await updateMe(token, { defaultReminderMessage: template });
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el mensaje');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl bg-white p-6">
        <h2 className="mb-1 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
          Ajustes
        </h2>
        <p className="mb-5 text-sm text-[#868585]">
          Mensaje con el que se precargan los recordatorios de WhatsApp (puedes seguir editando el
          de cada cliente antes de enviarlo).
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Mensaje por defecto</label>
            <textarea
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setSaved(false);
              }}
              rows={4}
              className={`${inputClass} resize-none leading-relaxed`}
            />
            <p className="mt-1.5 text-xs text-[#868585]">
              <span className="font-semibold">{'{nombre}'}</span> se cambia por el nombre del
              cliente. <span className="font-semibold">{'{fecha}'}</span> se cambia sola por su
              sesión (o sus próximas sesiones, si tiene varias esa semana) — mira los ejemplos de
              abajo.
            </p>
            <button
              type="button"
              onClick={() => {
                setTemplate(DEFAULT_REMINDER_TEMPLATE);
                setSaved(false);
              }}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#868585] hover:text-[#2b2b2a]"
            >
              <RotateCcw size={12} />
              Restablecer al mensaje predeterminado
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className={labelClass}>Así se vería</p>
            <div className="rounded-lg border border-gray-100 bg-[#f7f7f5] p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                Con una sesión esa semana
              </p>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#2b2b2a]">
                {renderRecordatorio(template, 'Pepe', unaSesion)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-[#f7f7f5] p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                Con varias sesiones esa semana
              </p>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#2b2b2a]">
                {renderRecordatorio(template, 'Pepe', variasSesiones)}
              </p>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          {saved && !error && (
            <p className="text-sm font-medium text-[#4b7a1f]">Guardado.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
