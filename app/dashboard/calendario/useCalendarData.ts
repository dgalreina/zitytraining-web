'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dayKey } from '@/components/MiniCalendar';
import { getUsers, getMe, getActiveClients } from '@/lib/usersApi';
import { getBookings, getBookingsByTrainers } from '@/lib/bookingsApi';
import { getHolidays } from '@/lib/holidaysApi';
import { bookingToEvent, FALLBACK_COLOR } from './bookingEvents';

export const ALL_VALUE = 'all';

// Todo lo que el calendario necesita PEDIR (rol, listas, reservas, puntitos,
// festivos); lo que hace con ello en pantalla se queda en page.tsx.
export function useCalendarData() {
  const router = useRouter();

  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [ownColor, setOwnColor] = useState(FALLBACK_COLOR);
  const [roleReady, setRoleReady] = useState(false);

  const [trainers, setTrainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(ALL_VALUE);
  const [loadingLists, setLoadingLists] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<Set<string>>(new Set());

  // Festivos (nacionales + Castilla y León automáticos, más los locales
  // que se añadan a mano en /dashboard/festivos): "YYYY-MM-DD" -> nombre.
  const [holidaysByDate, setHolidaysByDate] = useState<Record<string, string>>({});
  const loadedHolidayYearsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    const { id, roles } = JSON.parse(storedUser);
    setUserId(id);

    const admin = roles?.includes('admin') ?? false;
    const trainer = roles?.includes('trainer') ?? false;
    setIsAdmin(admin);
    setIsTrainer(trainer);

    if (trainer) {
      getMe(token)
        .then((me) => setOwnColor(me.color || FALLBACK_COLOR))
        .catch(() => {});
    }

    if (admin || trainer) {
      setLoadingLists(true);
      Promise.all([getUsers(token), getActiveClients(token)])
        .then(([users, activeClients]) => {
          const activeTrainers = users.filter(
            (u: any) => u.roles?.includes('trainer') && u.status === 'active',
          );
          setTrainers(activeTrainers);
          // Todos marcados por defecto: al entrar se ve el calendario completo.
          setSelectedTrainerIds(activeTrainers.map((t: any) => t._id));
          // El backend ya manda favoritos primero; aquí solo desempata alfabéticamente.
          const sortedClients = [...activeClients].sort((a: any, b: any) => {
            if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es');
          });
          setClients(sortedClients);
        })
        .finally(() => setLoadingLists(false));
    }

    setRoleReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // El backend devuelve TODAS las sesiones de un cliente sin filtrar por
  // entrenador (no sabe combinar ambos filtros); se cruza aquí.
  async function fetchFilteredBookings(token: string, from: string, to: string): Promise<any[]> {
    if (selectedClientId !== ALL_VALUE) {
      if (selectedTrainerIds.length === 0) return [];
      const data = await getBookings(token, { client: selectedClientId, from, to });
      return data.filter((b: any) => selectedTrainerIds.includes(b.trainer?._id));
    }
    if (selectedTrainerIds.length > 0) {
      return getBookingsByTrainers(token, selectedTrainerIds, from, to);
    }
    return [];
  }

  async function loadBookings(fromStr: string, toStr: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await fetchFilteredBookings(token, fromStr, toStr);
      setEvents(data.map(bookingToEvent));
    } catch {
      // silencioso
    }
  }

  async function loadMonthDots(monthDate: Date) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    try {
      const data = await fetchFilteredBookings(token, start.toISOString(), end.toISOString());
      const keys = new Set<string>(data.map((b: any) => dayKey(new Date(b.startTime))));
      setDaysWithBookings(keys);
    } catch {
      // silencioso
    }
  }

  function loadHolidaysForYear(year: number) {
    if (loadedHolidayYearsRef.current.has(year)) return;
    loadedHolidayYearsRef.current.add(year);
    const token = localStorage.getItem('token');
    if (!token) return;
    getHolidays(token, year)
      .then((data: any[]) => {
        setHolidaysByDate((prev) => {
          const next = { ...prev };
          data.forEach((h) => {
            next[h.date.slice(0, 10)] = h.name;
          });
          return next;
        });
      })
      .catch(() => {
        // Silencioso: si falla, simplemente no se marcan festivos ese año.
        loadedHolidayYearsRef.current.delete(year);
      });
  }

  return {
    userId,
    isAdmin,
    isTrainer,
    ownColor,
    roleReady,
    trainers,
    clients,
    selectedTrainerIds,
    setSelectedTrainerIds,
    selectedClientId,
    setSelectedClientId,
    loadingLists,
    events,
    loadBookings,
    fetchFilteredBookings,
    daysWithBookings,
    loadMonthDots,
    holidaysByDate,
    loadHolidaysForYear,
  };
}
