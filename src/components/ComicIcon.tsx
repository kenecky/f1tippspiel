import { ICON_PATHS, type IconName } from './iconPaths';
import type { SessionType } from '../domain/types';

const INK = '#0b0b10';
const RIM = '#f4f4f7';

/** Comic-Sticker: heller Rand, dunkle Kontur, kräftige Füllung, harter Schatten */
function Layers({ d, color, rim = true }: { d: string; color: string; rim?: boolean }) {
  return (
    <>
      <path d={d} transform="translate(14 16)" fill={INK} stroke={INK} strokeWidth={rim ? 34 : 18} strokeLinejoin="round" opacity={0.85} />
      {rim && <path d={d} fill={RIM} stroke={RIM} strokeWidth={34} strokeLinejoin="round" />}
      <path d={d} fill={color} stroke={INK} strokeWidth={16} strokeLinejoin="round" paintOrder="stroke" />
    </>
  );
}

interface Props {
  name: IconName;
  color: string;
  size?: number;
  /** Kleines Zusatz-Icon unten rechts (z. B. Blitz für Sprint-Qualifying) */
  badge?: { name: IconName; color: string };
  className?: string;
  title?: string;
}

export function ComicIcon({ name, color, size = 24, badge, className, title }: Props) {
  return (
    <svg
      className={`comic-icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="-28 -28 320 320"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <Layers d={ICON_PATHS[name]} color={color} />
      {badge && (
        <g transform="translate(124 124) scale(0.58)">
          <Layers d={ICON_PATHS[badge.name]} color={badge.color} />
        </g>
      )}
    </svg>
  );
}

export const COLORS = {
  yellow: '#ffcc00',
  red: '#ff3b30',
  teal: '#00d8c0',
  blue: '#4d9bff',
  grey: '#c9cbd6',
  white: '#ffffff',
};

const SESSION_ICON: Record<SessionType, Omit<Props, 'size'>> = {
  sprintQuali: { name: 'timer', color: COLORS.blue, badge: { name: 'lightning', color: COLORS.yellow } },
  sprint: { name: 'lightning', color: COLORS.yellow },
  quali: { name: 'timer', color: COLORS.blue },
  race: { name: 'flag_checkered', color: COLORS.white },
};

export function SessionIcon({ type, size = 22 }: { type: SessionType; size?: number }) {
  return <ComicIcon {...SESSION_ICON[type]} size={size} className="session-icon" />;
}
