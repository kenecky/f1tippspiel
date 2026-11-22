import { createContext, useContext, useEffect, useState } from 'react';
import type { PlayerId } from './domain/types';

/** Aktuelle Zeit, tickt im angegebenen Intervall (für Countdown und Sperre). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * Der Spieler dieses Geräts. Testphase: fest Spieler 1.
 * Später: kommt aus dem Login.
 */
export const ME: PlayerId = 'p1';

export const ActivePlayerContext = createContext<{ me: PlayerId }>({ me: ME });

export const useMe = () => useContext(ActivePlayerContext);

export const other = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/**
 * Ist diese Seite gerade die sichtbare? Nachbarseiten werden fürs Wischen
 * vorab gerendert und dürfen keine Nebenwirkungen auslösen.
 */
export const PageActiveContext = createContext(true);
export const usePageActive = () => useContext(PageActiveContext);
