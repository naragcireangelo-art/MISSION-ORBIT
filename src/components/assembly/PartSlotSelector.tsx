/**
 * PartSlotSelector.tsx — One slot of the build (Antenna, Laser, Body or Thruster).
 *
 * Shows the slot's three options as a radio group. Arrow keys move between options (native radio
 * behaviour), and each card shows the part's headline stat. Locked parts (when
 * ENFORCE_PART_UNLOCKS is on) are disabled and show their star requirement.
 */

import {
  PARTS,
  PART_SLOT_DESCRIPTIONS,
  PART_SLOT_LABELS,
  isPartUnlocked,
  type AnyPart,
  type PartSlot,
} from '../../data/parts';
import { IconLock } from '../ui/icons';

/** The one stat that best describes a part, as a value and a label. */
export function partHeadline(part: AnyPart): { label: string; value: string } {
  switch (part.slot) {
    case 'body':
      return { label: 'Hull', value: `${part.hull}` };
    case 'antenna':
      return { label: 'Range', value: `${Math.round(part.scanRangeMultiplier * 100)}%` };
    case 'laser':
      return { label: 'Free errors', value: `${part.freeErrors}` };
    case 'thruster':
      return { label: 'Speed', value: part.speed.toFixed(1) };
  }
}

export interface PartSlotSelectorProps {
  slot: PartSlot;
  selectedId: string;
  onSelect: (id: string) => void;
  totalStars: number;
}

export function PartSlotSelector({ slot, selectedId, onSelect, totalStars }: PartSlotSelectorProps) {
  const parts = PARTS[slot] as readonly AnyPart[];
  return (
    <fieldset className="mo-asm__slot">
      <legend className="mo-asm__slot-title">
        <span>{PART_SLOT_LABELS[slot]}</span>
        <small>{PART_SLOT_DESCRIPTIONS[slot]}</small>
      </legend>
      <div className="mo-asm__options" role="radiogroup" aria-label={PART_SLOT_LABELS[slot]}>
        {parts.map((part) => {
          const unlocked = isPartUnlocked(part, totalStars);
          const selected = part.id === selectedId;
          const head = partHeadline(part);
          return (
            <label
              key={part.id}
              className={`mo-asm__option${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}
            >
              <input
                type="radio"
                name={`slot-${slot}`}
                value={part.id}
                checked={selected}
                disabled={!unlocked}
                onChange={() => onSelect(part.id)}
              />
              <span className="mo-asm__option-name">{part.name}</span>
              <span className="mo-asm__option-type">{part.typeLabel}</span>
              <span className="mo-asm__option-stat">
                {unlocked ? (
                  <>
                    <b>{head.value}</b> {head.label}
                  </>
                ) : (
                  <>
                    <IconLock size={12} /> {part.unlockStars} stars
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default PartSlotSelector;
