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
