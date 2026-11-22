const dtf = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const df = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });
const tf = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export const fmtDateTime = (iso: string) => dtf.format(new Date(iso));
export const fmtDate = (iso: string) => df.format(new Date(iso));
export const fmtTime = (iso: string) => tf.format(new Date(iso));

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'gestartet';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} T ${h} Std`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')} Std`;
  return `${m}:${String(sec).padStart(2, '0')} Min`;
}

const FLAGS: Record<string, string> = {
  Australia: '🇦🇺', China: '🇨🇳', Japan: '🇯🇵', Bahrain: '🇧🇭', 'Saudi Arabia': '🇸🇦', USA: '🇺🇸',
  'United States': '🇺🇸', Italy: '🇮🇹', Monaco: '🇲🇨', Spain: '🇪🇸', Canada: '🇨🇦', Austria: '🇦🇹',
  UK: '🇬🇧', 'United Kingdom': '🇬🇧', Belgium: '🇧🇪', Hungary: '🇭🇺', Netherlands: '🇳🇱', Azerbaijan: '🇦🇿',
  Singapore: '🇸🇬', Mexico: '🇲🇽', Brazil: '🇧🇷', Qatar: '🇶🇦', UAE: '🇦🇪', 'Abu Dhabi': '🇦🇪',
};
export const flag = (country: string) => FLAGS[country] ?? '🏁';

/** Laufende Uhr: „2 T 03:12:45“ bzw. „3:12:45“ */
export function fmtClock(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d > 0 ? `${d} T ` : ''}${d > 0 ? pad(h) : h}:${pad(m)}:${pad(sec)}`;
}
