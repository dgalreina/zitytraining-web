export const DEFAULT_TRAINER_COLOR = '#868585';

export function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

export function getAvatarGradient(hex?: string | null): string {
  const base = hex || DEFAULT_TRAINER_COLOR;
  const dark = shadeColor(base, -55);
  return `linear-gradient(135deg, ${base}, ${dark})`;
}