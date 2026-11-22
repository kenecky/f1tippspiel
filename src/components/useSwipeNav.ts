import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { navigate } from '../router';

/** Reihenfolge der Hauptmenüpunkte (wie in der Navigation) */
export const SWIPE_ORDER = ['', 'kalender', 'wertung', 'funk', 'mehr'];

const LOCK_DISTANCE = 10; // px bis die Richtung feststeht
const COMMIT_RATIO = 0.25; // Anteil der Breite, ab dem gewechselt wird
const COMMIT_VELOCITY = 0.35; // px/ms – schneller Wisch reicht auch
const EASE = 'cubic-bezier(0.22, 0.8, 0.2, 1)';

/** Bereiche, in denen horizontales Wischen etwas anderes bedeutet */
const IGNORE =
  '[data-no-swipe], input, textarea, select, .quick, .slot, .sheet, .dialog, .sheet-backdrop, .dialog-backdrop';

/**
 * Karussell zwischen den Hauptseiten.
 * Die Nachbarseiten sind bereits gerendert (.peek.prev / .peek.next) und liegen
 * links/rechts neben der aktuellen Seite. Beim Wischen wird der ganze Streifen
 * (main) verschoben – die Nachbarseite ist sofort sichtbar.
 * Animation direkt über style.transform, ohne React-Render pro Bewegung.
 */
export function useSwipeNav(ref: RefObject<HTMLElement | null>, page: string, isTopLevel: boolean) {
  const committed = useRef(false);
  const state = useRef({ isTopLevel, index: SWIPE_ORDER.indexOf(page) });
  state.current = { isTopLevel, index: SWIPE_ORDER.indexOf(page) };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x0 = 0, y0 = 0, t0 = 0, dx = 0;
    let lock: 'h' | 'v' | null = null;
    let tracking = false;
    let busy = false;

    const setX = (x: number, transition = 'none') => {
      el.style.transition = transition;
      el.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    };

    /** Nachbarseiten auf Höhe des sichtbaren Bereichs einblenden */
    const showPeeks = () => {
      const top = el.classList.contains('radio-mode') ? 0 : window.scrollY;
      el.style.setProperty('--peek-y', `${top}px`);
      el.classList.add('swiping');
    };
    const hidePeeks = () => el.classList.remove('swiping');

    const onStart = (e: TouchEvent) => {
      tracking = false;
      if (busy || !state.current.isTopLevel || e.touches.length !== 1) return;
      if ((e.target as Element | null)?.closest?.(IGNORE)) return;
      if (document.querySelector('.sheet, .dialog, .slot.lifted')) return;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
      dx = 0;
      lock = null;
      tracking = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const mx = e.touches[0].clientX - x0;
      const my = e.touches[0].clientY - y0;
      if (!lock) {
        if (Math.abs(mx) < LOCK_DISTANCE && Math.abs(my) < LOCK_DISTANCE) return;
        lock = Math.abs(mx) > Math.abs(my) * 1.3 ? 'h' : 'v';
        if (lock === 'v') {
          tracking = false;
          return;
        }
        x0 = e.touches[0].clientX; // ohne Sprung starten
        showPeeks();
      }
      if (e.cancelable) e.preventDefault();
      const raw = e.touches[0].clientX - x0;
      const { index } = state.current;
      const atEdge = (index === 0 && raw > 0) || (index === SWIPE_ORDER.length - 1 && raw < 0);
      dx = atEdge ? raw * 0.25 : raw; // Widerstand am Rand
      setX(dx);
    };

    const onEnd = () => {
      if (!tracking || lock !== 'h') {
        tracking = false;
        return;
      }
      tracking = false;
      const width = el.offsetWidth || window.innerWidth;
      const velocity = dx / Math.max(1, performance.now() - t0);
      const dir = dx < 0 ? 1 : -1; // 1 = nächster Menüpunkt
      const target = state.current.index + dir;
      const valid = target >= 0 && target < SWIPE_ORDER.length;
      const far = Math.abs(dx) > width * COMMIT_RATIO || Math.abs(velocity) > COMMIT_VELOCITY;

      if (!valid || !far) {
        setX(0, `transform 220ms ${EASE}`);
        window.setTimeout(() => {
          if (!tracking) hidePeeks();
        }, 230);
        return;
      }
      busy = true;
      navigator.vibrate?.(8);
      // Restweg proportional animieren – schneller Wisch = kurze Animation
      const remaining = width - Math.abs(dx);
      const ms = Math.round(Math.min(260, Math.max(120, (remaining / width) * 300)));
      setX(-dir * width, `transform ${ms}ms ${EASE}`);
      window.setTimeout(() => {
        committed.current = true;
        navigate(...(SWIPE_ORDER[target] ? [SWIPE_ORDER[target]] : []));
        busy = false;
      }, ms);
    };

    // Auf dem ganzen Fenster lauschen – auch unterhalb kurzer Seiten wischbar
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [ref]);

  // Nach dem Wechsel: Streifen zurücksetzen – noch vor dem Zeichnen, damit nichts springt.
  // Die bisherige Nachbarseite ist jetzt die aktuelle (gleiches Element, kein Neuaufbau).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = '';
    el.classList.remove('swiping');
    if (committed.current) {
      committed.current = false;
      window.scrollTo(0, 0);
    }
  }, [page, ref]);
}
