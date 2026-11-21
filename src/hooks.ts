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
 * Aktiver Spieler. Testphase: Umschalter in der App (beide auf einem Gerät möglich).
 * Später: kommt aus dem Login.
 */
export const ActivePlayerContext = createContext<{ me: PlayerId; setMe: (p: PlayerId) => void }>({
  me: 'p1',
  setMe: () => {},
});

export const useMe = () => useContext(ActivePlayerContext);

export const other = (p: PlayerId): PlayerId => (p === 'p1' ? 'p2' : 'p1');

export function loadActivePlayer(): PlayerId {
  try {
    return localStorage.getItem('activePlayer') === 'p2' ? 'p2' : 'p1';
  } catch {
    return 'p1';
  }
}

export function storeActivePlayer(p: PlayerId) {
  try {
    localStorage.setItem('activePlayer', p);
  } catch {
    /* egal */
  }
}

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
