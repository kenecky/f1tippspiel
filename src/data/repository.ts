import type {
  Driver, Player, PlayerId, Race, SeasonResult, SeasonTip, SessionResult, Team, Tip,
} from '../domain/types';

/**
 * Abstraktion über die Datenhaltung.
 *
 * Testphase:  LocalRepository (IndexedDB auf dem Handy)
 * Später:     ApiRepository (eigener Server + Datenbank, Login pro Spieler)
 *
 * Die UI spricht ausschließlich mit diesem Interface.
 * Schreibende Methoden für Tipps MÜSSEN die Sperre prüfen (später serverseitig)
 * und werfen dann TipLockedError.
 */
export interface Repository {
  // Spieler
  getPlayers(): Promise<Player[]>;
  savePlayers(players: Player[]): Promise<void>;

  // Stammdaten
  getSeason(): Promise<number>;
  setSeason(season: number): Promise<void>;
  saveCalendar(season: number, races: Race[], drivers: Driver[], teams: Team[]): Promise<void>;
  /** Fahrer manuell ein-/ausblenden; undefined = automatische Erkennung */
  setDriverVisibility(season: number, driverId: string, visible: boolean | undefined): Promise<void>;

  // Tipps
  saveTip(tip: Omit<Tip, 'id' | 'updatedAt'>): Promise<Tip>;
  saveSeasonTip(tip: Omit<SeasonTip, 'id' | 'updatedAt'>): Promise<SeasonTip>;

  // Ergebnisse
  saveResult(result: Omit<SessionResult, 'updatedAt'>): Promise<void>;
  saveSeasonResult(result: SeasonResult): Promise<void>;

  // Boxenfunk
  sendMessage(from: PlayerId, to: PlayerId, text: string): Promise<void>;
  markMessagesRead(to: PlayerId): Promise<void>;

  // Wartung
  resetAll(): Promise<void>;
}
