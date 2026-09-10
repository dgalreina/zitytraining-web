import { DEFAULT_TRAINER_COLOR } from '@/lib/colors';

export default function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color || DEFAULT_TRAINER_COLOR }}
    />
  );
}
