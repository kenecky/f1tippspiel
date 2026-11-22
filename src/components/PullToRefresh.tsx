import { useEffect, useRef, useState } from 'react';
import { usePageActive } from '../hooks';

const THRESHOLD = 80; // px (gedämpft) bis zum Auslösen
const MAX_PULL = 120;

/**
 * Aktualisieren durch Runterwischen – nur wenn ganz oben gescrollt
 * und der Finger im oberen Drittel des Bildschirms ansetzt.
 * Anzeige: fünf Startlichter, die nacheinander aufleuchten.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<string | void> }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const start = useRef<number | null>(null);
  const startX = useRef(0);
  const pullRef = useRef(0);
  const busyRef = useRef(false);
  const lastLit = useRef(0);
  const active = usePageActive();

  useEffect(() => {
    if (!active) return; // Nachbarseite beim Wischen: nicht reagieren
    const onStart = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      if (y > window.innerHeight / 3) return;
      start.current = y;
      startX.current = e.touches[0].clientX;
      lastLit.current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const raw = e.touches[0].clientY - start.current;
      const sideways = Math.abs(e.touches[0].clientX - startX.current);
      // Horizontales Wischen (Seitenwechsel) → kein Pull-to-Refresh
      if (pullRef.current === 0 && sideways > 10 && sideways > raw) {
        start.current = null;
        return;
      }
      if (raw <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const damped = Math.min(MAX_PULL, raw * 0.5);
      pullRef.current = damped;
      setPull(damped);
      const lit = Math.min(5, Math.floor((damped / THRESHOLD) * 5));
      if (lit > lastLit.current) {
        navigator.vibrate?.(lit === 5 ? 20 : 6);
        lastLit.current = lit;
      }
    };
    const onEnd = async () => {
      if (start.current === null) return;
      start.current = null;
      const reached = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (!reached) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const msg = await onRefresh();
        if (msg) setToast(msg);
      } catch (err) {
        setToast(`Fehler: ${(err as Error).message}`);
      } finally {
        busyRef.current = false;
        setBusy(false);
        window.setTimeout(() => setToast(''), 3500);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [onRefresh, active]);

  const lit = busy ? 5 : Math.min(5, Math.floor((pull / THRESHOLD) * 5));
  const height = busy ? 56 : pull;

  return (
    <>
      <div className={`ptr ${busy ? 'busy' : ''}`} style={{ height }} aria-hidden={!busy && pull === 0}>
        <div className="ptr-lights">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i < lit ? 'on' : ''} />
          ))}
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
