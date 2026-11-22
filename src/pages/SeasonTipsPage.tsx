import { useState } from 'react';
import { Card, LockBadge, PlayerDot, SaveState } from '../components/ui';
import { DriverSelect, TeamSelect } from '../components/SheetSelect';
import { useDrivers, useAllDrivers, usePlayers, useRaces, useSeasonResult, useSeasonTips, useTeams } from '../data/queries';
import { repo } from '../data/localRepository';
import { isSeasonLocked, seasonLockTime } from '../domain/lock';
import { RULES } from '../domain/rules';
import type { SeasonTip } from '../domain/types';
import { useMe, useNow } from '../hooks';

/** Saisontipps (Weltmeister) – eingebettet unten auf der Tipps-Seite */
export function SeasonTipsSection({ season }: { season: number }) {
  const races = useRaces(season)?.filter((r) => r.round < 900);
  const drivers = useDrivers(season);
  const allDrivers = useAllDrivers(season);
  const teams = useTeams(season);
  const tips = useSeasonTips(season);
  const result = useSeasonResult(season);
  const players = usePlayers();
  const { me } = useMe();
  const now = useNow(1000);

  if (!races || !drivers || !allDrivers || !teams || !tips || !players) return null;

  const locked = isSeasonLocked(races, now);
  const lockAt = seasonLockTime(races);
  const dName = (id?: string) => allDrivers.find((d) => d.id === id)?.lastName ?? '—';
  const tName = (id?: string) => teams.find((t) => t.id === id)?.name ?? '—';

  return (
    <section className="stack" id="saisontipps">
      <div className="row">
        <h2>🏆 Saisontipps</h2>
        <LockBadge locked={locked} until={lockAt?.toISOString()} />
      </div>
      <p className="small muted">
        Fahrer-Weltmeister +{RULES.seasonPoints.championDriver} · Team-Weltmeister +{RULES.seasonPoints.championTeam}
        {!locked && ' · Die Tipps der anderen Person siehst du ab Saisonstart.'}
      </p>

      {!locked ? (
        <MySeasonTip
          key={`${season}:${me}:${tips.find((t) => t.playerId === me)?.id ?? 'new'}`}
          season={season}
          existing={tips.find((t) => t.playerId === me)}
          drivers={drivers}
          teams={teams}
        />
      ) : (
        <>
          <Card>
            <table className="compare">
              <thead><tr><th></th><th>Fahrer</th><th>Team</th></tr></thead>
              <tbody>
                {players.map((p) => {
                  const t = tips.find((x) => x.playerId === p.id);
                  return (
                    <tr key={p.id}>
                      <td><PlayerDot id={p.id} /> {p.name}</td>
                      <td className={result?.championDriverId ? (t?.championDriverId === result.championDriverId ? 'hit-exact' : 'miss') : ''}>{dName(t?.championDriverId)}</td>
                      <td className={result?.championTeamId ? (t?.championTeamId === result.championTeamId ? 'hit-exact' : 'miss') : ''}>{tName(t?.championTeamId)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card>
            <h3>Tatsächliche Weltmeister</h3>
            <div className="field">
              <span>Fahrer</span>
              <DriverSelect title="Fahrer-Weltmeister" drivers={drivers} teams={teams} value={result?.championDriverId}
                onChange={(v) => repo.saveSeasonResult({ ...result, season, championDriverId: v })} />
            </div>
            <div className="field">
              <span>Team</span>
              <TeamSelect title="Team-Weltmeister" teams={teams} value={result?.championTeamId}
                onChange={(v) => repo.saveSeasonResult({ ...result, season, championTeamId: v })} />
            </div>
          </Card>
        </>
      )}
    </section>
  );
}

function MySeasonTip({ season, existing, drivers, teams }: {
  season: number; existing?: SeasonTip; drivers: import('../domain/types').Driver[]; teams: import('../domain/types').Team[];
}) {
  const { me } = useMe();
  const [driverId, setDriverId] = useState(existing?.championDriverId);
  const [teamId, setTeamId] = useState(existing?.championTeamId);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>(existing ? 'saved' : 'idle');
  const [error, setError] = useState('');

  const persist = async (d?: string, t?: string) => {
    try {
      await repo.saveSeasonTip({ season, playerId: me, championDriverId: d, championTeamId: t });
      setState('saved');
      setError('');
    } catch (e) {
      setState('error');
      setError((e as Error).message);
    }
  };

  return (
    <Card>
      <div className="row">
        <h3>Dein Tipp</h3>
        <SaveState state={state} />
      </div>
      <div className="field">
        <span>Fahrer-Weltmeister</span>
        <DriverSelect title="Fahrer-Weltmeister" drivers={drivers} teams={teams} value={driverId}
          onChange={(v) => { setDriverId(v); persist(v, teamId); }} />
      </div>
      <div className="field">
        <span>Team-Weltmeister</span>
        <TeamSelect title="Team-Weltmeister" teams={teams} value={teamId}
          onChange={(v) => { setTeamId(v); persist(driverId, v); }} />
      </div>
      {error && <p className="error small">{error}</p>}
    </Card>
  );
}
