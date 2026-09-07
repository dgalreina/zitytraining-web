const GRAY = '#c7c9c6';
const GREEN = '#6aa842';

type IconProps = { size?: number; className?: string };

function Svg({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {children}
    </svg>
  );
}

// Silueta de torso compartida (frontal): cabeza, tronco y brazos a los
// lados, siempre en gris. Cada icono resalta en verde solo el musculo
// que representa, encima de esta base.
function TorsoBase() {
  return (
    <>
      <circle cx="12" cy="3.6" r="2.2" fill={GRAY} />
      <polygon points="7,7 17,7 16,20 8,20" fill={GRAY} />
      <rect x="4.3" y="8" width="2.2" height="8" rx="1.1" fill={GRAY} />
      <rect x="17.5" y="8" width="2.2" height="8" rx="1.1" fill={GRAY} />
    </>
  );
}

export function ChestIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <TorsoBase />
      <ellipse cx="9.4" cy="10.3" rx="2" ry="2.6" fill={GREEN} />
      <ellipse cx="14.6" cy="10.3" rx="2" ry="2.6" fill={GREEN} />
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <TorsoBase />
      <polygon points="8,8 16,8 15,17 9,17" fill={GREEN} />
      <line x1="12" y1="8" x2="12" y2="17" stroke="white" strokeWidth={1} />
    </Svg>
  );
}

export function ShouldersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <TorsoBase />
      <circle cx="7" cy="7.6" r="2.4" fill={GREEN} />
      <circle cx="17" cy="7.6" r="2.4" fill={GREEN} />
    </Svg>
  );
}

export function BicepsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="20" r="2.6" fill={GRAY} />
      <rect x="9.8" y="13.5" width="4.4" height="7" rx="2.2" fill={GRAY} />
      <circle cx="12" cy="9" r="5.3" fill={GREEN} />
      <circle cx="12" cy="4" r="2.3" fill={GRAY} />
    </Svg>
  );
}

export function TricepsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="20" r="2.6" fill={GRAY} />
      <rect x="9.8" y="12.5" width="4.4" height="8" rx="2.2" fill={GRAY} />
      <rect x="9.5" y="4" width="5" height="9.5" rx="2.5" fill={GREEN} />
      <circle cx="12" cy="4" r="2.6" fill={GRAY} />
    </Svg>
  );
}

export function LegsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="3" width="6" height="3.5" rx="1.5" fill={GRAY} />
      <rect x="6.5" y="6" width="4.3" height="8.5" rx="2" fill={GREEN} />
      <rect x="13.2" y="6" width="4.3" height="8.5" rx="2" fill={GREEN} />
      <rect x="7" y="15" width="3.3" height="6" rx="1.5" fill={GRAY} />
      <rect x="13.7" y="15" width="3.3" height="6" rx="1.5" fill={GRAY} />
    </Svg>
  );
}

export function CoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <TorsoBase />
      <rect x="9" y="10.5" width="6" height="8.5" rx="1.5" fill={GREEN} />
      <line x1="12" y1="10.5" x2="12" y2="19" stroke="white" strokeWidth={1} />
      <line x1="9" y1="13.6" x2="15" y2="13.6" stroke="white" strokeWidth={1} />
      <line x1="9" y1="16.3" x2="15" y2="16.3" stroke="white" strokeWidth={1} />
    </Svg>
  );
}

export function ForearmIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="20" r="2.6" fill={GREEN} />
      <rect x="9.8" y="12" width="4.4" height="8.5" rx="2.2" fill={GREEN} />
      <rect x="9.5" y="4" width="5" height="8.5" rx="2.5" fill={GRAY} />
      <circle cx="12" cy="4" r="2.6" fill={GRAY} />
    </Svg>
  );
}

export function CardioIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fill={GREEN}
        d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
      />
      <path
        d="M4 10.5h2.6l1.5-3l1.8 5l1.6-4l1.2 2h3.8"
        stroke="white"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function OlympicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5.5" y="11" width="13" height="2" rx="1" fill={GREEN} />
      <rect x="1.5" y="7.5" width="3" height="9" rx="1" fill={GREEN} />
      <rect x="19.5" y="7.5" width="3" height="9" rx="1" fill={GREEN} />
      <rect x="4.3" y="9" width="2" height="6" rx="0.7" fill={GREEN} />
      <rect x="17.7" y="9" width="2" height="6" rx="0.7" fill={GREEN} />
    </Svg>
  );
}

export function GeneralIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8.5" y="11" width="7" height="2" rx="1" fill={GREEN} />
      <rect x="3" y="8.7" width="3" height="6.6" rx="1.2" fill={GREEN} />
      <rect x="18" y="8.7" width="3" height="6.6" rx="1.2" fill={GREEN} />
      <rect x="6.3" y="9.7" width="2" height="4.6" rx="0.7" fill={GREEN} />
      <rect x="15.7" y="9.7" width="2" height="4.6" rx="0.7" fill={GREEN} />
    </Svg>
  );
}
