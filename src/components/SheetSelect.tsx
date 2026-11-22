import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Driver, Team } from '../domain/types';
import { groupByTeam } from './ui';

export interface SheetOption {
  value: string;
  label: ReactNode;
  sub?: string;
  teamId?: string;
}

export interface SheetGroup {
  title?: string;
  teamId?: string;
  options: SheetOption[];
}

interface Props {
  title: string;
  value?: string;
  groups: SheetGroup[];
  placeholder?: string;
  disabled?: boolean;
  renderValue?: (value: string) => ReactNode;
  onChange: (value: string | undefined) => void;
}

/** Eigenes Auswahlmenü: Feld öffnet ein Bottom-Sheet im App-Design. */
export function SheetSelect({ title, value, groups, placeholder = '– wählen –', disabled, renderValue, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = groups.flatMap((g) => g.options).find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (v: string | undefined) => {
    onChange(v);
    navigator.vibrate?.(10);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`select-field ${selected?.teamId ? `team-${selected.teamId}` : ''}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className={selected ? '' : 'muted'}>
          {selected ? (renderValue ? renderValue(selected.value) : selected.label) : placeholder}
        </span>
        <span className="chev" aria-hidden>▾</span>
      </button>

      {open &&
        createPortal(
          <div className="sheet-backdrop" onClick={() => setOpen(false)}>
            <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <span className="grabber" aria-hidden />
                <h3>{title}</h3>
                <button type="button" className="icon-btn" aria-label="Schließen" onClick={() => setOpen(false)}>✕</button>
              </div>
              <div className="sheet-body">
                <button type="button" className={`sheet-option none ${!value ? 'selected' : ''}`} onClick={() => choose(undefined)}>
                  <span className="muted">Keine Auswahl</span>
                </button>
                {groups.map((g, gi) => (
                  <div key={gi} className="sheet-group">
                    {g.title && <div className={`sheet-group-title team-${g.teamId ?? 'none'}`}>{g.title}</div>}
                    {g.options.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className={`sheet-option team-${o.teamId ?? 'none'} ${o.value === value ? 'selected' : ''}`}
                        onClick={() => choose(o.value)}
                      >
                        <span className="opt-label">{o.label}</span>
                        {o.sub && <small className="muted">{o.sub}</small>}
                        {o.value === value && <span className="check" aria-hidden>✓</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function DriverSelect({ title, drivers, teams, value, disabled, onChange }: {
  title: string; drivers: Driver[]; teams: Team[]; value?: string; disabled?: boolean; onChange: (v: string | undefined) => void;
}) {
  const groups: SheetGroup[] = groupByTeam(drivers, teams).map((g) => ({
    title: g.name,
    teamId: g.teamId,
    options: g.drivers.map((d) => ({
      value: d.id,
      teamId: d.teamId,
      label: <><b>{d.code}</b> {d.firstName} {d.lastName}</>,
      sub: d.regular === false ? 'Ersatz' : undefined,
    })),
  }));
  return <SheetSelect title={title} value={value} groups={groups} disabled={disabled} onChange={onChange} />;
}

export function TeamSelect({ title, teams, value, disabled, onChange }: {
  title: string; teams: Team[]; value?: string; disabled?: boolean; onChange: (v: string | undefined) => void;
}) {
  const groups: SheetGroup[] = [{
    options: teams.map((t) => ({
      value: t.id,
      teamId: t.id,
      label: <b>{t.name}</b>,
      sub: t.standing ? `P${t.standing} WM` : undefined,
    })),
  }];
  return <SheetSelect title={title} value={value} groups={groups} disabled={disabled} onChange={onChange} />;
}
