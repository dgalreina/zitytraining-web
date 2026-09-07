// Numera los slots: normales van 1, 2, 3... y los que comparten
// supersetGroup (superserie) se numeran juntos como 1a, 1b, 1c...
export function computeSlotLabels(items: { supersetGroup?: string }[]): string[] {
  const labels: string[] = [];
  let counter = 0;
  let i = 0;

  while (i < items.length) {
    const group = items[i].supersetGroup;

    if (!group) {
      counter++;
      labels.push(String(counter));
      i++;
      continue;
    }

    counter++;
    let letter = 0;
    while (i < items.length && items[i].supersetGroup === group) {
      labels.push(`${counter}${String.fromCharCode(97 + letter)}`);
      letter++;
      i++;
    }
  }

  return labels;
}

// Agrupa slots consecutivos que comparten supersetGroup en bloques,
// conservando su posicion original en la lista plana (para poder mirar
// su etiqueta con computeSlotLabels). Un bloque de 1 es un ejercicio
// normal; de 2 o mas es una superserie.
export function groupSlotsForDisplay(items: any[]): { slot: any; flatIndex: number }[][] {
  const blocks: { slot: any; flatIndex: number }[][] = [];
  let i = 0;

  while (i < items.length) {
    const group = items[i].supersetGroup;

    if (!group) {
      blocks.push([{ slot: items[i], flatIndex: i }]);
      i++;
      continue;
    }

    const block: { slot: any; flatIndex: number }[] = [];
    while (i < items.length && items[i].supersetGroup === group) {
      block.push({ slot: items[i], flatIndex: i });
      i++;
    }
    blocks.push(block);
  }

  return blocks;
}
