import { useEffect, useState } from 'react';
import type { Driver } from '../domain/types';
import { DriverTag, sortDrivers } from './ui';

interface Props {
  drivers: Driver[];
  value: string[];
  depth: number;
  disabled?: boolean;
  onChange: (order: string[]) => void;
}

/**
 * Positionen P1..PN befüllen: Platz antippen → Fahrer antippen.
 * Ist ein Fahrer schon gesetzt, werden die Plätze getauscht.
 */
export function DriverPicker({ drivers, value, depth, disabled, onChange }: Props) {
  const slots = Array.from({ length: depth }, (_, i) => value[i] ?? '');
  const firstEmpty = () => {
    const i = slots.findIndex((s) => !s);
    return i === -1 ? depth - 1 : i;
  };
  const [active, setActive] = useState<number>(firstEmpty);
  useEffect(() => {
    if (active >= depth) setActive(depth - 1);
  }, [depth, active]);

  const byId = new Map(drivers.map((d) => [d.id, d]));

  const pick = (driverId: string) => {
    if (disabled) return;
    const next = [...slots];
    const existing = next.indexOf(driverId);
    if (existing === active) {
      next[active] = '';
    } else {
      if (existing !== -1) next[existing] = next[active];
      next[active] = driverId;
    }
    onChange(next);
    const empty = next.findIndex((s, i) => !s && i > active);
    const anyEmpty = next.findIndex((s) => !s);
    setActive(empty !== -1 ? empty : anyEmpty !== -1 ? anyEmpty : active);
  };

  const clear = (i: number) => {
    const next = [...slots];
    next[i] = '';
    onChange(next);
    setActive(i);
  };

  return (
    <div className={`picker ${disabled ? 'disabled' : ''}`}>
      <ol className="slots">
        {slots.map((id, i) => (
          <li key={i}>
            <button
              type="button"
              className={`slot ${i === active && !disabled ? 'active' : ''}`}
              onClick={() => !disabled && setActive(i)}
              disabled={disabled}
            >
              <span className="pos">P{i + 1}</span>
              {id ? <DriverTag driver={byId.get(id)} fallbackId={id} /> : <span className="muted">Fahrer wählen…</span>}
            </button>
            {id && !disabled && (
              <button type="button" className="icon-btn" aria-label={`P${i + 1} leeren`} onClick={() => clear(i)}>✕</button>
            )}
          </li>
        ))}
      </ol>

      {!disabled && (
        <>
          <p className="hint">Für <b>P{active + 1}</b> einen Fahrer antippen:</p>
          <div className="driver-grid">
            {sortDrivers(drivers).map((d) => {
              const pos = slots.indexOf(d.id);
              return (
                <button
                  type="button"
                  key={d.id}
                  className={`driver-btn team-${d.teamId ?? 'none'} ${pos !== -1 ? 'placed' : ''}`}
                  onClick={() => pick(d.id)}
                >
                  <b>{d.code}</b>
                  <small>{pos !== -1 ? `P${pos + 1}` : d.lastName}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
