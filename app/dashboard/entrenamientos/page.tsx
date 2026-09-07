'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import WorkoutsTab from './WorkoutsTab';
import ExercisesTab from './ExercisesTab';

type Tab = 'workouts' | 'exercises';

function tabButtonClass(active: boolean) {
  return `px-4 py-2.5 text-sm font-semibold transition ${
    active
      ? 'border-b-2 border-[#6aa842] text-[#4b7a1f]'
      : 'text-[#868585] hover:text-[#2b2b2a]'
  }`;
}

export default function EntrenamientosPage() {
  const [tab, setTab] = useState<Tab>('workouts');
  const [topOffset, setTopOffset] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Igual que en Fichar/Calendario: se mide cuanto ocupa lo que hay por
  // encima (titulo + pestañas) para que solo la lista de dentro haga
  // scroll, en vez de la pagina entera.
  useEffect(() => {
    function recalcOffset() {
      const el = contentRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const BOTTOM_GAP = 24;
      setTopOffset(top + BOTTOM_GAP);
    }
    recalcOffset();
    window.addEventListener('resize', recalcOffset);
    return () => window.removeEventListener('resize', recalcOffset);
  }, [tab]);

  return (
    <div className="max-w-2xl">
      <h2 className="mb-5 flex items-center gap-2 font-[family-name:var(--font-work-sans)] text-lg font-bold text-[#2b2b2a]">
        <ClipboardList size={20} />
        Entrenamientos
      </h2>

      <div className="mb-5 flex gap-1 border-b border-gray-200">
        <button onClick={() => setTab('workouts')} className={tabButtonClass(tab === 'workouts')}>
          Entrenamientos
        </button>
        <button onClick={() => setTab('exercises')} className={tabButtonClass(tab === 'exercises')}>
          Ejercicios
        </button>
      </div>

      <div
        ref={contentRef}
        className="flex min-h-0 flex-col"
        style={topOffset !== null ? { height: `calc(100dvh - ${topOffset}px)` } : undefined}
      >
        {tab === 'workouts' ? <WorkoutsTab /> : <ExercisesTab />}
      </div>
    </div>
  );
}
