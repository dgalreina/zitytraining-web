'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Clock, X } from 'lucide-react';
import {
  TRAINING_CATEGORIES,
  TRAINING_PLANS,
  REMOTE_SERVICES,
  TrainingPlan,
  RemoteService,
} from '@/lib/pricing';
import { createPurchase, createCheckoutSession, getMyPurchases } from '@/lib/api';

type Tab = 'plan' | 'contratar' | 'historial';
type Selection = { type: 'plan'; item: TrainingPlan } | { type: 'service'; item: RemoteService };
type PlanPaymentMode = 'monthly' | 'sessions';

const tabs: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Tu plan' },
  { id: 'contratar', label: 'Contratar' },
  { id: 'historial', label: 'Historial' },
];

function formatPrice(price: number | 'free') {
  return price === 'free' ? 'Gratis' : `${price}€`;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente de confirmar',
    active: 'Activo',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function PagosPage() {
  const [tab, setTab] = useState<Tab>('contratar');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [planPaymentMode, setPlanPaymentMode] = useState<PlanPaymentMode>('monthly');
  const [purchases, setPurchases] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'canceled'; message: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  function loadPurchases(onLoaded?: (data: any[]) => void) {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    getMyPurchases(token)
      .then((data) => {
        setPurchases(data);
        onLoaded?.(data);
      })
      .catch(() => setPurchases([]));
  }

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setTab('plan');
      router.replace('/dashboard/pagos');
      loadPurchases((data) => {
        const hasActive = data.some((p: any) => p.status === 'active');
        setBanner({
          type: 'success',
          message: hasActive
            ? '¡Pago confirmado! Tu plan ya está activo.'
            : 'Pago recibido. Tu plan se activará en unos instantes.',
        });
      });
    } else if (searchParams.get('canceled') === 'true') {
      setBanner({ type: 'canceled', message: 'Pago cancelado, no se ha realizado ningún cargo.' });
      router.replace('/dashboard/pagos');
      loadPurchases();
    } else {
      loadPurchases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSelection(sel: Selection) {
    setSelection(sel);
    setPlanPaymentMode('monthly');
    setError('');
  }

  function getModalPrice(): number {
    if (!selection) return 0;
    if (selection.type === 'service') {
      return selection.item.price === 'free' ? 0 : selection.item.price;
    }
    return planPaymentMode === 'monthly'
      ? selection.item.monthlyPrice
      : selection.item.sessionPrice * selection.item.sessionCount;
  }

  async function handleConfirm() {
    if (!selection) return;
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload =
        selection.type === 'plan'
          ? {
              type: 'plan',
              itemId: selection.item.id,
              itemLabel: `${selection.item.label} (${
                TRAINING_CATEGORIES.find((c) => c.id === selection.item.category)?.title
              })`,
              paymentMode: planPaymentMode === 'monthly' ? 'monthly' : 'sessions',
              price: getModalPrice(),
              sessionCount: planPaymentMode === 'sessions' ? selection.item.sessionCount : undefined,
            }
          : {
              type: 'service',
              itemId: selection.item.id,
              itemLabel: selection.item.label,
              paymentMode: 'one_time',
              price: getModalPrice(),
            };

      const purchase = await createPurchase(token, payload);

      if (payload.price === 0) {
        // Servicio gratuito: no hace falta pasar por Stripe
        setSelection(null);
        setBanner({ type: 'success', message: '¡Listo! Se ha registrado tu solicitud gratuita.' });
        loadPurchases();
        return;
      }

      const { url } = await createCheckoutSession(token, purchase._id);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar el pago');
      setSaving(false);
    }
  }

  const activeItems = purchases?.filter((p) => p.status === 'active') || [];

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
                : 'text-[#868585] hover:text-[#2b2b2a]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {banner && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            banner.type === 'success'
              ? 'bg-[#a2c037]/10 text-[#4b7a1f]'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="h-[calc(100dvh-230px)] overflow-y-auto pr-1">
        {tab === 'plan' && (
          <div className="flex flex-col gap-3">
            {purchases === null ? (
              <div className="rounded-xl bg-white p-6">
                <p className="text-sm text-gray-400">Cargando...</p>
              </div>
            ) : activeItems.length === 0 ? (
              <div className="rounded-xl bg-white p-6">
                <p className="text-sm text-gray-400">
                  Todavía no tienes ningún plan o servicio activo. Ve a la pestaña "Contratar"
                  para elegir uno.
                </p>
              </div>
            ) : (
              activeItems.map((item) => (
                <div key={item._id} className="rounded-xl bg-white p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
                      {item.itemLabel}
                    </h2>
                    {statusBadge(item.status)}
                  </div>
                  <p className="text-2xl font-bold text-[#4b7a1f]">
                    {item.price}€
                    {item.paymentMode === 'monthly' && (
                      <span className="text-sm font-normal text-[#868585]"> /mes</span>
                    )}
                  </p>
                  {item.sessionCount && (
                    <p className="mt-1 text-xs text-[#868585]">
                      Bono de {item.sessionCount} sesiones
                    </p>
                  )}
                  {item.activatedAt && (
                    <p className="mt-2 text-xs text-[#868585]">
                      Activo desde el{' '}
                      {new Date(item.activatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'contratar' && (
          <div className="flex flex-col gap-8">
            {TRAINING_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h2 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                  {category.title}
                </h2>
                <p className="mb-3 text-xs text-[#868585]">{category.description}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {TRAINING_PLANS.filter((p) => p.category === category.id).map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-xl bg-white p-4 ${
                        plan.featured ? 'border-2 border-[#6aa842]' : 'border border-gray-100'
                      }`}
                    >
                      {plan.featured && (
                        <span className="mb-2 inline-block rounded-md bg-[#a2c037]/15 px-2.5 py-1 text-xs font-semibold text-[#4b7a1f]">
                          Más elegido
                        </span>
                      )}
                      <div className="mb-2 flex items-center gap-2">
                        <Clock size={17} className="text-[#4b7a1f]" />
                        <span className="text-sm font-semibold text-[#2b2b2a]">{plan.label}</span>
                      </div>
                      <p className="text-xl font-bold text-[#2b2b2a]">
                        {plan.monthlyPrice}€
                        <span className="text-xs font-normal text-[#868585]"> /mes</span>
                      </p>
                      <p className="mb-3 text-xs text-[#868585]">
                        o {plan.sessionPrice}€ x {plan.sessionCount} sesiones
                      </p>
                      <button
                        onClick={() => openSelection({ type: 'plan', item: plan })}
                        className="w-full rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Elegir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <h2 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Seguimiento a distancia
              </h2>
              <p className="mb-3 text-xs text-[#868585]">Servicios puntuales, pago único.</p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REMOTE_SERVICES.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"
                  >
                    <span className="text-sm text-[#2b2b2a]">{service.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#4b7a1f]">
                        {formatPrice(service.price)}
                      </span>
                      <button
                        onClick={() => openSelection({ type: 'service', item: service })}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[#2b2b2a] hover:bg-gray-200"
                      >
                        Elegir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'historial' && (
          <div className="overflow-hidden rounded-xl bg-white">
            {purchases === null ? (
              <p className="p-6 text-sm text-gray-400">Cargando...</p>
            ) : purchases.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">Todavía no tienes pagos registrados.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-[#868585]">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Concepto</th>
                    <th className="px-5 py-3">Importe</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p._id} className="border-b border-gray-50">
                      <td className="px-5 py-3 text-[#868585]">
                        {new Date(p.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#2b2b2a]">{p.itemLabel}</td>
                      <td className="px-5 py-3 text-[#868585]">{p.price}€</td>
                      <td className="px-5 py-3">{statusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-work-sans)] text-base font-bold text-[#2b2b2a]">
                Confirmar selección
              </h3>
              <button
                onClick={() => setSelection(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 text-sm font-semibold text-[#2b2b2a]">{selection.item.label}</p>

            {selection.type === 'plan' && (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setPlanPaymentMode('monthly')}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                    planPaymentMode === 'monthly'
                      ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                      : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                  }`}
                >
                  Suscripción mensual
                </button>
                <button
                  onClick={() => setPlanPaymentMode('sessions')}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                    planPaymentMode === 'sessions'
                      ? 'border-[#6aa842] bg-[#a2c037]/10 text-[#4b7a1f]'
                      : 'border-gray-200 text-[#868585] hover:bg-gray-50'
                  }`}
                >
                  Bono de sesiones
                </button>
              </div>
            )}

            <div className="mb-4 rounded-lg bg-[#f7f7f5] p-4">
              <p className="text-lg font-bold text-[#4b7a1f]">
                {getModalPrice()}€
                {selection.type === 'plan' && planPaymentMode === 'monthly' && (
                  <span className="text-sm font-normal text-[#868585]"> /mes</span>
                )}
                {selection.type === 'plan' && planPaymentMode === 'sessions' && (
                  <span className="text-sm font-normal text-[#868585]">
                    {' '}
                    ({selection.item.sessionCount} sesiones)
                  </span>
                )}
              </p>
            </div>

            <p className="mb-4 text-xs text-[#868585]">
              {getModalPrice() === 0
                ? 'Este servicio es gratuito, no se te pedirá ningún pago.'
                : 'Se te redirigirá a una página segura de Stripe para completar el pago.'}
            </p>

            {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#a2c037] to-[#6aa842] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Check size={16} />
              {saving ? 'Redirigiendo...' : 'Confirmar y pagar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}