import { AttendanceEntry } from './attendanceApi';

// Suma de horas trabajadas a partir de una lista de fichajes. Uno sin
// clockOut (fichado ahora mismo) cuenta hasta este instante, no se
// descarta: así el total "lleva esto en lo que va de mes" es correcto
// aunque se mire a media tarde con el fichaje todavía abierto.
export function sumHoursWorked(entries: AttendanceEntry[]): number {
  const now = Date.now();
  const totalMs = entries.reduce((acc, e) => {
    const start = new Date(e.clockIn).getTime();
    const end = e.clockOut ? new Date(e.clockOut).getTime() : now;
    return acc + Math.max(0, end - start);
  }, 0);
  return totalMs / 3600000;
}

export function formatHoursWorked(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}
