import type { ReactNode } from 'react';
import type { Driver, PlayerId } from '../domain/types';
import { fmtCountdown } from '../format';
import { useNow } from '../hooks';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Countdown({ to }: { to: string }) {
  const now = useNow(1000);
  return <span className="countdown">{fmtCountdown(new Date(to).getTime() - now.getTime())}</span>;
}

export function LockBadge({ locked }: { locked: boolean }) {
  return <span className={`pill ${locked ? 'locked' : 'open'}`}>{locked ? '🔒 gesperrt' : '🟢 offen'}</span>;
}

export function DriverTag({ driver, fallbackId, compact }: { driver?: Driver; fallbackId?: string; compact?: boolean }) {
  if (!driver) return <span className="driver muted">{fallbackId ?? '—'}</span>;
  return (
    <span className={`driver team-${driver.teamId ?? 'none'}`}>
      <b>{driver.code}</b>{!compact && <> <span className="muted">{driver.lastName}</span></>}
    </span>
  );
}

export function PlayerDot({ id }: { id: PlayerId }) {
  return <span className={`dot ${id}`} aria-hidden />;
}

export function BackLink({ to, label = 'Zurück' }: { to: string; label?: string }) {
  return <a className="back" href={to}>‹ {label}</a>;
}

export function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => (a.teamId ?? 'zz').localeCompare(b.teamId ?? 'zz') || a.lastName.localeCompare(b.lastName));
}
