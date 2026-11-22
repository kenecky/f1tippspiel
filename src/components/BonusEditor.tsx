import type { BonusAnswers, Driver, Team } from '../domain/types';
import { RULES } from '../domain/rules';
import { DriverSelect } from './SheetSelect';

interface Props {
  drivers: Driver[];
  teams: Team[];
  value: BonusAnswers;
  disabled?: boolean;
  onChange: (b: BonusAnswers) => void;
  /** Hinweis auf das verlängerte DotD-Fenster (beim Tippen, nicht beim Ergebnis) */
  showDotdHint?: boolean;
}

export function BonusEditor({ drivers, teams, value, disabled, onChange, showDotdHint }: Props) {
  return (
    <div className="bonus">
      <div className="field">
        <span>Schnellste Runde <small className="muted">+{RULES.bonusPoints.fastestLap}</small></span>
        <DriverSelect
          title="Schnellste Runde"
          drivers={drivers}
          teams={teams}
          value={value.fastestLap}
          disabled={disabled}
          onChange={(v) => onChange({ ...value, fastestLap: v })}
        />
      </div>
      <div className="field">
        <span>
          Driver of the Day <small className="muted">+{RULES.bonusPoints.driverOfTheDay}</small>
          {showDotdHint && <small className="muted block">Änderbar bis {RULES.driverOfTheDayWindowMinutes} Min. nach Rennstart</small>}
        </span>
        <DriverSelect
          title="Driver of the Day"
          drivers={drivers}
          teams={teams}
          value={value.driverOfTheDay}
          disabled={disabled}
          onChange={(v) => onChange({ ...value, driverOfTheDay: v })}
        />
      </div>
      <div className="field">
        <span>Safety Car / VSC? <small className="muted">+{RULES.bonusPoints.safetyCar}</small></span>
        <div className="segmented">
          {[true, false].map((v) => (
            <button
              type="button"
              key={String(v)}
              disabled={disabled}
              className={value.safetyCar === v ? 'active' : ''}
              onClick={() => onChange({ ...value, safetyCar: value.safetyCar === v ? undefined : v })}
            >
              {v ? 'Ja' : 'Nein'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
