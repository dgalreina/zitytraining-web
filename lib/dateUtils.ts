// Último día del mes de una fecha 'yyyy-MM-dd', en el mismo formato.
// Usado para no dejar que un plan puntual cruce de un mes a otro (tiene
// un precio único para todo su periodo, no se puede repartir entre meses).
export function lastDayOfMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  const last = new Date(year, month, 0);
  const mm = String(last.getMonth() + 1).padStart(2, '0');
  const dd = String(last.getDate()).padStart(2, '0');
  return `${last.getFullYear()}-${mm}-${dd}`;
}
