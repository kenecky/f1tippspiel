/**
 * Ermittelt das aktuelle Stammfahrer-Feld aus den letzten Rennergebnissen.
 *
 * Regel: pro Team die 2 Fahrer mit den meisten Einsätzen in den übergebenen
 * Rennen; bei Gleichstand gewinnt, wer zuletzt gefahren ist.
 * → Einmalige Ersatzfahrer fallen raus, der Stammfahrer bleibt drin.
 */
export interface ResultEntry {
  driverId: string;
  teamId: string;
}

export const SEATS_PER_TEAM = 2;

/** @param rounds Ergebnisse, neuestes Rennen zuerst */
export function selectLineup(rounds: ResultEntry[][]): Map<string, string> {
  const stats = new Map<string, { teamId: string; count: number; lastSeen: number }>();

  rounds.forEach((entries, age) => {
    for (const { driverId, teamId } of entries) {
      const s = stats.get(driverId);
      if (!s) {
        stats.set(driverId, { teamId, count: 1, lastSeen: age });
      } else {
        s.count++;
        // Team aus dem jüngsten Einsatz behalten
        if (age < s.lastSeen) {
          s.lastSeen = age;
          s.teamId = teamId;
        }
      }
    }
  });

  const byTeam = new Map<string, { driverId: string; count: number; lastSeen: number }[]>();
  for (const [driverId, s] of stats) {
    byTeam.set(s.teamId, [...(byTeam.get(s.teamId) ?? []), { driverId, count: s.count, lastSeen: s.lastSeen }]);
  }

  const lineup = new Map<string, string>();
  for (const [teamId, drivers] of byTeam) {
    drivers
      .sort((a, b) => b.count - a.count || a.lastSeen - b.lastSeen)
      .slice(0, SEATS_PER_TEAM)
      .forEach((d) => lineup.set(d.driverId, teamId));
  }
  return lineup;
}
