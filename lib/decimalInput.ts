// Para campos numéricos con decimales (peso, precio, %...) se usa
// type="text" + inputMode="decimal" en vez de type="number": así se
// puede escribir con coma (lo natural en español, "72,5") y no hay
// validación nativa de "step" que rechace cifras como 2.76 en un campo
// pensado con step="0.5" — con type="number" el navegador bloqueaba el
// envío del formulario en silencio en ambos casos.

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
