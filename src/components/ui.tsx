import type { ReactNode } from 'react';
import type { Driver, PlayerId, Team } from '../domain/types';
import { fmtClock, fmtCountdown } from '../format';
import { useNow } from '../hooks';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Countdown({ to }: { to: string }) {
  const now = useNow(1000);
  return <span className="countdown">{fmtCountdown(new Date(to).getTime() - now.getTime())}</span>;
}

/** Status-Badge; offen mit laufender Restzeit bis Tippschluss */
export function LockBadge({ locked, until }: { locked: boolean; until?: string }) {
  const now = useNow(1000);
  if (locked) return <span className="pill locked">🔒 gesperrt</span>;
  return (
    <span className="pill open">
      🟢 offen{until && <span className="clock"> {fmtClock(new Date(until).getTime() - now.getTime())}</span>}
    </span>
  );
}

/** Kleiner Hinweis „gespeichert“ für Auto-Save */
export function SaveState({ state }: { state: 'idle' | 'saved' | 'error'; error?: string }) {
  if (state === 'idle') return null;
  return <span className={`save-state ${state}`}>{state === 'saved' ? '✓ gespeichert' : '⚠︎ nicht gespeichert'}</span>;
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

export function sortDrivers<T extends Driver>(drivers: T[]): T[] {
  // Ersatzfahrer ans Ende, sonst nach Team und Name
  const reserve = (d: Driver) => (d.regular === false ? 1 : 0);
  return [...drivers].sort(
    (a, b) => reserve(a) - reserve(b) || (a.teamId ?? 'zz').localeCompare(b.teamId ?? 'zz') || a.lastName.localeCompare(b.lastName),
  );
}

export interface TeamGroup<T extends Driver> {
  teamId: string;
  name: string;
  drivers: T[];
}

/**
 * Fahrer nach Team gruppieren, Teams nach Konstrukteurs-WM sortiert,
 * Fahrer im Team nach Fahrer-WM. Ersatzfahrer landen bei ihrem Team.
 */
export function groupByTeam<T extends Driver>(drivers: T[], teams: Team[]): TeamGroup<T>[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const groups = new Map<string, T[]>();
  for (const d of drivers) {
    const key = d.teamId && teamMap.has(d.teamId) ? d.teamId : '_other';
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const rank = (id: string) => (id === '_other' ? 999 : teamMap.get(id)?.standing ?? 500);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || (teamMap.get(a)?.name ?? a).localeCompare(teamMap.get(b)?.name ?? b))
    .map(([teamId, list]) => ({
      teamId,
      name: teamId === '_other' ? 'Weitere' : teamMap.get(teamId)!.name,
      drivers: [...list].sort(
        (a, b) =>
          (a.regular === false ? 1 : 0) - (b.regular === false ? 1 : 0) ||
          (a.standing ?? 99) - (b.standing ?? 99) ||
          a.code.localeCompare(b.code),
      ),
    }));
}
