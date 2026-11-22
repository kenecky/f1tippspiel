import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Driver, Team } from '../domain/types';
import { DriverTag, groupByTeam } from './ui';

interface Props {
  drivers: Driver[];
  teams: Team[];
  value: string[];
  depth: number;
  disabled?: boolean;
  onChange: (order: string[]) => void;
}

const LONG_PRESS_MS = 280;
const MOVE_TOLERANCE = 8;
const SETTLE_MS = 160;

interface DragState {
  from: number;
  over: number;
  startY: number; // clientY + scrollY beim Anheben
  dy: number;
  step: number; // Abstand zwischen zwei Zeilen in px
  settling: boolean;
}

const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* nicht unterstützt */
  }
};

/** Element verschieben; die übrigen rutschen nach. Leere Plätze bleiben erhalten. */
export function moveSlot(order: string[], from: number, to: number): string[] {
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Tipp-Liste P1..PN.
 *  - Platz antippen → Fahrer unten antippen
 *  - Lange drücken → per Drag & Drop verschieben
 */
export function DriverPicker({ drivers, teams, value, depth, disabled, onChange }: Props) {
  const slots = Array.from({ length: depth }, (_, i) => value[i] ?? '');
  const firstEmpty = () => {
    const i = slots.findIndex((s) => !s);
    return i === -1 ? depth - 1 : i;
  };
  const [active, setActive] = useState<number>(firstEmpty);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [noAnim, setNoAnim] = useState(false);

  const listRef = useRef<HTMLOListElement>(null);
  const pickRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const press = useRef<{ timer: number; x: number; y: number; index: number; pointerId: number; el: HTMLElement } | null>(null);
  const lastClientY = useRef(0);
  const suppressClick = useRef(false);
  const raf = useRef(0);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    if (active >= depth) setActive(depth - 1);
  }, [depth, active]);

  const byId = new Map(drivers.map((d) => [d.id, d]));

  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // Während des Ziehens darf die Seite nicht scrollen
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  const recompute = useCallback(() => {
    const d = dragRef.current;
    if (!d || d.settling) return;
    const dy = lastClientY.current + window.scrollY - d.startY;
    const over = Math.max(0, Math.min(depth - 1, d.from + Math.round(dy / d.step)));
    if (over !== d.over) vibrate(8);
    updateDrag({ ...d, dy, over });
  }, [depth]);

  // Auto-Scroll am Bildschirmrand
  const autoScroll = useCallback(() => {
    const d = dragRef.current;
    if (!d || d.settling) return;
    const y = lastClientY.current;
    const top = 90;
    const bottom = window.innerHeight - 110;
    const speed = y < top ? -Math.min(12, (top - y) / 4) : y > bottom ? Math.min(12, (y - bottom) / 4) : 0;
    if (speed) {
      window.scrollBy(0, speed);
      recompute();
    }
    raf.current = requestAnimationFrame(autoScroll);
  }, [recompute]);

  const startDrag = (index: number, el: HTMLElement, pointerId: number) => {
    const items = listRef.current?.querySelectorAll<HTMLElement>(':scope > li');
    const step = items && items.length > 1 ? items[1].offsetTop - items[0].offsetTop : el.offsetHeight + 6;
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* egal */
    }
    vibrate(25);
    updateDrag({ from: index, over: index, startY: lastClientY.current + window.scrollY, dy: 0, step, settling: false });
    raf.current = requestAnimationFrame(autoScroll);
  };

  const finishDrag = () => {
    cancelAnimationFrame(raf.current);
    const d = dragRef.current;
    if (!d) return;
    suppressClick.current = true;
    // 1. Zeile weich auf den Zielplatz gleiten lassen
    updateDrag({ ...d, dy: (d.over - d.from) * d.step, settling: true });
    window.setTimeout(() => {
      // 2. Reihenfolge übernehmen – ohne Animation, damit nichts springt
      setNoAnim(true);
      if (d.over !== d.from) {
        onChange(moveSlot(slotsRef.current, d.from, d.over));
        setActive(d.over);
        vibrate(15);
      }
      updateDrag(null);
      requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
    }, SETTLE_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, index: number) => {
    if (disabled || !slots[index] || dragRef.current) return;
    lastClientY.current = e.clientY;
    const el = e.currentTarget;
    const timer = window.setTimeout(() => {
      if (press.current) startDrag(index, el, press.current.pointerId);
      press.current = null;
    }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY, index, pointerId: e.pointerId, el };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    lastClientY.current = e.clientY;
    const p = press.current;
    if (p && (Math.abs(e.clientX - p.x) > MOVE_TOLERANCE || Math.abs(e.clientY - p.y) > MOVE_TOLERANCE)) {
      clearTimeout(p.timer); // Nutzer scrollt
      press.current = null;
    }
    if (dragRef.current) recompute();
  };

  const onPointerEnd = () => {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
    if (dragRef.current && !dragRef.current.settling) finishDrag();
  };

  const transformFor = (i: number): string | undefined => {
    if (!drag) return undefined;
    if (i === drag.from) return `translateY(${drag.dy}px) scale(${drag.settling ? 1 : 1.03})`;
    if (drag.from < drag.over && i > drag.from && i <= drag.over) return `translateY(${-drag.step}px)`;
    if (drag.from > drag.over && i >= drag.over && i < drag.from) return `translateY(${drag.step}px)`;
    return undefined;
  };

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
      <ol className={`slots ${drag ? 'dragging' : ''} ${noAnim ? 'no-anim' : ''}`} ref={listRef}>
        {slots.map((id, i) => {
          const isDragged = drag?.from === i;
          return (
            <li key={i}>
              <span className="pos">P{i + 1}</span>
              <div
                className={`slot ${i === active && !disabled && !drag ? 'active' : ''} ${isDragged ? 'lifted' : ''} ${isDragged && drag?.settling ? 'settling' : ''} ${id ? 'filled' : ''}`}
                style={{ transform: transformFor(i) }}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  if (disabled) return;
                  setActive(i);
                  // Zur Fahrerauswahl scrollen
                  requestAnimationFrame(() => pickRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }}
              >
                {id ? <DriverTag driver={byId.get(id)} fallbackId={id} /> : <span className="muted">Fahrer wählen…</span>}
                {id && !disabled && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`P${i + 1} leeren`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      clear(i);
                    }}
                  >
                    ✕
                  </button>
                )}
                {id && !disabled && <span className="grip" aria-hidden>⋮⋮</span>}
              </div>
            </li>
          );
        })}
      </ol>
      {!disabled && (
        <div className="pick-area" ref={pickRef}>
          <div className="pick-bar">
            <button type="button" className="icon-btn" aria-label="Vorheriger Platz" disabled={active === 0} onClick={() => setActive(active - 1)}>‹</button>
            <div className="pick-current">
              <span className="pick-label">Fahrer für</span>
              <b className="pick-pos">P{active + 1}</b>
              {slots[active] && (
                <span className="pick-replace">
                  ersetzt <DriverTag compact driver={byId.get(slots[active])} fallbackId={slots[active]} />
                </span>
              )}
            </div>
            <button type="button" className="icon-btn" aria-label="Nächster Platz" disabled={active === depth - 1} onClick={() => setActive(active + 1)}>›</button>
            <button
              type="button"
              className="icon-btn up"
              aria-label="Zur Platzierungsliste"
              onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              ↑
            </button>
          </div>
          <div className="team-groups">
            {groupByTeam(drivers, teams).map((g) => (
              <div key={g.teamId} className="team-group">
                <div className={`team-name team-${g.teamId}`}>{g.name}</div>
                <div className="driver-grid">
                  {g.drivers.map((d) => {
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
