import type { BonusAnswers, Driver } from '../domain/types';
import { RULES } from '../domain/rules';
import { sortDrivers } from './ui';

interface Props {
  drivers: Driver[];
  value: BonusAnswers;
  disabled?: boolean;
  onChange: (b: BonusAnswers) => void;
}

export function BonusEditor({ drivers, value, disabled, onChange }: Props) {
  const sorted = sortDrivers(drivers);
  const select = (key: 'fastestLap' | 'driverOfTheDay', label: string, pts: number) => (
    <label className="field">
      <span>{label} <small className="muted">+{pts}</small></span>
      <select
        value={value[key] ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, [key]: e.target.value || undefined })}
      >
        <option value="">– wählen –</option>
        {sorted.map((d) => (
          <option key={d.id} value={d.id}>{d.code} · {d.firstName} {d.lastName}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="bonus">
      {select('fastestLap', 'Schnellste Runde', RULES.bonusPoints.fastestLap)}
      {select('driverOfTheDay', 'Driver of the Day', RULES.bonusPoints.driverOfTheDay)}
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
