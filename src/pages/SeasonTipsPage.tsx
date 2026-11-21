import { useEffect, useState } from 'react';
import { BackLink, Card, Countdown, LockBadge, PlayerDot, sortDrivers } from '../components/ui';
import { useDrivers, usePlayers, useRaces, useSeason, useSeasonResult, useSeasonTips, useTeams } from '../data/queries';
import { repo } from '../data/localRepository';
import { isSeasonLocked, seasonLockTime } from '../domain/lock';
import { RULES } from '../domain/rules';
import { useMe, useNow } from '../hooks';
import { href } from '../router';

export function SeasonTipsPage() {
  const season = useSeason();
  const races = useRaces(season)?.filter((r) => r.round < 900);
  const drivers = useDrivers(season);
  const teams = useTeams(season);
  const tips = useSeasonTips(season);
  const result = useSeasonResult(season);
  const players = usePlayers();
  const { me } = useMe();
  const now = useNow(1000);

  const mine = tips?.find((t) => t.playerId === me);
  const [driverId, setDriverId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    setDriverId(mine?.championDriverId ?? '');
    setTeamId(mine?.championTeamId ?? '');
  }, [mine?.championDriverId, mine?.championTeamId, me]);

  if (!season || !races || !drivers || !teams || !tips || !players) return <p className="muted">Lade…</p>;

  const locked = isSeasonLocked(races, now);
  const lockAt = seasonLockTime(races);
  const dName = (id?: string) => drivers.find((d) => d.id === id)?.lastName ?? '—';
  const tName = (id?: string) => teams.find((t) => t.id === id)?.name ?? '—';

  const save = async () => {
    try {
      await repo.saveSeasonTip({ season, playerId: me, championDriverId: driverId || undefined, championTeamId: teamId || undefined });
      setMsg({ ok: true, text: 'Saisontipp gespeichert.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="stack">
      <BackLink to={href('mehr')} label="Mehr" />
      <div className="row">
        <h1>Saisontipps {season}</h1>
        <LockBadge locked={locked} />
      </div>
      <p className="small muted">
        Weltmeister Fahrer +{RULES.seasonPoints.championDriver} · Weltmeister Team +{RULES.seasonPoints.championTeam}
        {lockAt && !locked && <> · Tippschluss in <Countdown to={lockAt.toISOString()} /></>}
      </p>

      {!locked ? (
        <Card>
          <label className="field">
            <span>🏆 Fahrer-Weltmeister</span>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">– wählen –</option>
              {sortDrivers(drivers).map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </label>
          <label className="field">
            <span>🏭 Konstrukteurs-Weltmeister</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">– wählen –</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {msg && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}
          <button className="btn primary block" onClick={save}>Speichern</button>
          <p className="small muted">Die Tipps der anderen Person siehst du ab Saisonstart.</p>
        </Card>
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
            <label className="field">
              <span>Fahrer</span>
              <select value={result?.championDriverId ?? ''} onChange={(e) => repo.saveSeasonResult({ ...result, season, championDriverId: e.target.value || undefined })}>
                <option value="">– noch offen –</option>
                {sortDrivers(drivers).map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Team</span>
              <select value={result?.championTeamId ?? ''} onChange={(e) => repo.saveSeasonResult({ ...result, season, championTeamId: e.target.value || undefined })}>
                <option value="">– noch offen –</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </Card>
        </>
      )}
    </div>
  );
}
