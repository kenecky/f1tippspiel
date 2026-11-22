import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const selected = groups.flatMap((g) => g.options).find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /** Sheet nach unten rausgleiten lassen, dann schließen */
  const close = () => {
    const sheet = sheetRef.current;
    if (!sheet || closing.current) return setOpen(false);
    closing.current = true;
    sheet.style.transition = 'transform 200ms cubic-bezier(0.4, 0, 1, 1)';
    sheet.style.transform = 'translateY(100%)';
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'background 200ms';
      backdropRef.current.style.background = 'rgba(0,0,0,0)';
    }
    window.setTimeout(() => {
      closing.current = false;
      setOpen(false);
    }, 200);
  };

  const choose = (v: string | undefined) => {
    onChange(v);
    navigator.vibrate?.(10);
    close();
  };

  // Runterwischen zum Schließen
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!open || !sheet) return;
    let y0 = 0, t0 = 0, dy = 0;
    let dragging = false, tracking = false;

    const onStart = (e: TouchEvent) => {
      const inHead = (e.target as Element).closest('.sheet-head');
      const atTop = (bodyRef.current?.scrollTop ?? 0) <= 0;
      tracking = !!inHead || atTop;
      dragging = false;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const d = e.touches[0].clientY - y0;
      if (!dragging) {
        if (d < 6) {
          if (d < -4) tracking = false; // nach oben = normal scrollen
          return;
        }
        dragging = true;
        y0 = e.touches[0].clientY;
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${dy}px)`;
      if (backdropRef.current) {
        const k = Math.max(0, 1 - dy / sheet.offsetHeight);
        backdropRef.current.style.background = `rgba(0,0,0,${0.55 * k})`;
      }
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const velocity = dy / Math.max(1, performance.now() - t0);
      if (dy > Math.min(140, sheet.offsetHeight * 0.3) || velocity > 0.5) {
        close();
      } else {
        sheet.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        sheet.style.transform = '';
        if (backdropRef.current) backdropRef.current.style.background = '';
      }
    };
    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
          <div className="sheet-backdrop" ref={backdropRef} onClick={close}>
            <div className="sheet" ref={sheetRef} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <span className="grabber" aria-hidden />
                <h3>{title}</h3>
                <button type="button" className="icon-btn" aria-label="Schließen" onClick={close}>✕</button>
              </div>
              <div className="sheet-body" ref={bodyRef}>
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
