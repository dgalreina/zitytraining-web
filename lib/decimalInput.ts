// Para campos con decimales se usa type="text" + inputMode="decimal" en
// vez de type="number": permite coma ("72,5") y evita que la validación
// nativa de "step" bloquee el envío en silencio.

export function sanitizeDecimalInput(raw: string): string {
  const unified = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = unified.indexOf('.');
  if (firstDot === -1) return unified;
  return unified.slice(0, firstDot + 1) + unified.slice(firstDot + 1).replace(/\./g, '');
}

export function parseDecimal(value: string): number | undefined {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}
