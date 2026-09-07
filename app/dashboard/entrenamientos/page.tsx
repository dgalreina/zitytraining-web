'use client';

import { useEffect, useState } from 'react';
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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

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

      {tab === 'workouts' ? <WorkoutsTab /> : <ExercisesTab />}
    </div>
  );
}
