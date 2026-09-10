'use client';

const SIZES = {
  sm: { track: 'h-4.5 w-8', thumb: 'h-3.5 w-3.5', on: 'left-4', off: 'left-0.5' },
  md: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'left-[22px]', off: 'left-0.5' },
};

export default function Switch({
  checked,
  onChange,
  activeColor = '#6aa842',
  size = 'md',
}: {
  checked: boolean;
  onChange: () => void;
  activeColor?: string;
  size?: 'sm' | 'md';
}) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative ${s.track} shrink-0 rounded-full transition-colors duration-300`}
      style={{ backgroundColor: checked ? activeColor : '#d1d5db' }}
    >
      <span
        className={`absolute top-0.5 ${s.thumb} rounded-full bg-white shadow transition-all duration-300 ${
          checked ? s.on : s.off
        }`}
      />
    </button>
  );
}
