/**
 * NameInput.tsx — Satellite callsign field (1–16 characters).
 *
 * Letters, digits, spaces and hyphens only (see data/parts.ts). Other characters are dropped as
 * they are typed. The field shows its own error so the screen can also block "Continue".
 */

import { useId, useState } from 'react';
import { MAX_NAME_LENGTH, validateSatelliteName } from '../../data/parts';

export interface NameInputProps {
  value: string;
  onChange: (raw: string) => void;
  /** Called when Enter is pressed in a valid field. */
  onSubmit?: () => void;
}

export function NameInput({ value, onChange, onSubmit }: NameInputProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const check = validateSatelliteName(value);
  const showError = touched && !check.valid;

  return (
    <div className={`mo-asm__name${showError ? ' is-invalid' : ''}`}>
      <label htmlFor={id} className="mo-asm__label">
        Satellite callsign
      </label>
      <div className="mo-asm__name-row">
        <input
          id={id}
          className="mo-asm__input"
          type="text"
          value={value}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. MARINER-II"
          aria-invalid={showError}
          aria-describedby={`${id}-help`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (check.valid) onSubmit?.();
            else setTouched(true);
          }}
        />
        <span className="mo-asm__count" aria-hidden="true">
          {value.length}/{MAX_NAME_LENGTH}
        </span>
      </div>
      <p id={`${id}-help`} className="mo-asm__help" role={showError ? 'alert' : undefined}>
        {showError ? check.error : 'Letters, digits, spaces and hyphens.'}
      </p>
    </div>
  );
}

export default NameInput;
