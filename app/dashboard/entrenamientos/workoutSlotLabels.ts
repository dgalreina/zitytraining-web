// Numera los slots: normales van 1, 2, 3... y los que van encadenados
// (linkedToNext) se numeran juntos como 1a, 1b, 1c... Cada slot solo
// sabe si esta enlazado con el SIGUIENTE, asi que apagar el enlace en
// cualquier punto de la cadena solo rompe esa union concreta.
export function computeSlotLabels(items: { linkedToNext?: boolean }[]): string[] {
  const labels: string[] = [];
  let counter = 0;
  let i = 0;

  while (i < items.length) {
    counter++;

    if (!items[i].linkedToNext) {
      labels.push(String(counter));
      i++;
      continue;
    }

    let letter = 0;
    let j = i;
    while (j < items.length) {
      labels.push(`${counter}${String.fromCharCode(97 + letter)}`);
      letter++;
      const linksFurther = items[j].linkedToNext;
      j++;
      if (!linksFurther) break;
    }
    i = j;
  }

  return labels;
}

// Agrupa slots consecutivos enlazados (linkedToNext) en bloques,
// conservando su posicion original en la lista plana (para poder mirar
// su etiqueta con computeSlotLabels). Un bloque de 1 es un ejercicio
// normal; de 2 o mas es una superserie.
export function groupSlotsForDisplay(items: any[]): { slot: any; flatIndex: number }[][] {
  const blocks: { slot: any; flatIndex: number }[][] = [];
  let i = 0;

  while (i < items.length) {
    if (!items[i].linkedToNext) {
      blocks.push([{ slot: items[i], flatIndex: i }]);
      i++;
      continue;
    }

    const block: { slot: any; flatIndex: number }[] = [];
    let j = i;
    while (j < items.length) {
      block.push({ slot: items[j], flatIndex: j });
      const linksFurther = items[j].linkedToNext;
      j++;
      if (!linksFurther) break;
    }
    blocks.push(block);
    i = j;
  }

  return blocks;
}
