// Normales: 1, 2, 3... Encadenados (linkedToNext): 1a, 1b, 1c...
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

// Agrupa slots consecutivos enlazados en bloques, con su índice original
// (para computeSlotLabels). Bloque de 1 = ejercicio normal; de 2+ = superserie.
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
