import { useEffect, useState } from 'react';

/** Hash-Routing: funktioniert auf GitHub Pages ohne Server-Rewrites. */
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => {
      setParts(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export const href = (...parts: (string | number)[]) => `#/${parts.map((p) => encodeURIComponent(String(p))).join('/')}`;

export const navigate = (...parts: (string | number)[]) => {
  window.location.hash = href(...parts);
};
