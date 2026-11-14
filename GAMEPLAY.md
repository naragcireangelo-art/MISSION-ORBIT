# Gameplay: how a flight works

The rules of a flight live in one place, `src/engine/flightSim.ts`, with no DOM, React or canvas in it. `ExploreScreen.tsx` only connects the pieces. To change how the game feels, edit the numbers in `src/engine/flightTypes.ts` (`GAMEPLAY`) and the tier table in `src/data/missions.ts` (`TIER_CONFIG`, `DIFFICULTY_RAMP`).

## The loop

1. **Approach.** The ship dodges waves of asteroids for `mission.segmentSeconds`.
2. **Target arrives.** The next body in `mission.targetIds` drifts in from the right.
3. **Scan.** When the body is within the antenna's range, the sim emits `scanTrigger` and the screen calls `router.beginScan(name)`. Time eases to 25%, spawning stops, the ship cannot be hurt, and WASD/arrows lock.
4. **Type the name.** `InputRouter` matches keystrokes; `ScanTelemetry` tracks WPM and accuracy; the Laser's free errors forgive mistakes.
5. **Resume.** On `scanComplete` the body leaves, time eases back to 100%, and the next segment starts.
6. **End.** All targets scanned gives `complete` (→ `reportMissionComplete`). Hull 0 gives `lost` (→ `reportSignalLost`).

## Rules and numbers

| Topic | Rule |
|---|---|
| Space | World is 1.0 tall and `aspect` wide. Speeds are "screen heights per second". |
| Ship | Moves freely in the left part of the screen (`SHIP_X_MIN`–`SHIP_X_MAX`). Top speed = thruster speed × body multiplier (`computeBuildStats`). |
| Hit | Rock overlaps the chassis box: −1 hull, `INVULN_S` (1.5 s) of blinking invulnerability, DSN signal −25%. A rock hits at most once. |
| Near miss | A rock passes within `NEAR_MISS_BAND` of the box without a hit. Counted once per rock, only when the ship is vulnerable. |
| DSN signal | HUD stat only. Dips on a hit and recovers toward `hull / maxHull`. |
| Scan range | `BASE_SCAN_RANGE × world width × antenna.scanRangeMultiplier`, but never before the body is on screen. |
| Difficulty | Tier sets crossing time, wave interval, max rocks and patterns. Each target ramps these up to `+DIFFICULTY_RAMP` (15%) by the last one. |
| Stars | One each for: all targets scanned, accuracy ≥ 90%, hull ≥ 50% (`STAR_RULES` in `useOutcomeStore.ts`). |

## Fairness guarantee

Every wave keeps a free lane open, and the lane only moves as far as the **slowest possible build** (heaviest body, weakest thruster) can follow between waves. So any build can finish any level. `npm test` proves it: a bot that can only press up/down flies that slowest build through all four tiers at several seeds. Tiers 2–4 finish with 0 hits; tier 1 finishes with at most one hit per run, and every run completes.

## Files

| File | Role |
|---|---|
| `engine/flightTypes.ts` | `GAMEPLAY` tuning, state and event types |
| `engine/flightPhysics.ts` | Smooth ship movement, bounds, collision box |
| `engine/spawner.ts` | Seeded asteroid waves and the safe lane |
| `engine/flightSim.ts` | Targets, scan trigger, hull, damage, win/loss |
| `engine/flightSim.test.ts` | Fairness bot and rule tests (`npm test`) |
| `screens/ExploreScreen.tsx` | GameLoop + InputRouter + sim + art layers + HUD |
| `art/` | `drawSatellite`, `drawAsteroid`, `drawStarfield` |

## Not built yet

- Pause, and quit to the Archive from inside a flight.
- Checkpoints after each scan (a loss restarts the level).
- Music during flight (`audioManager` sound effects are wired; the ambient track comes from the menu).
- Balance: part stats and tier numbers are initial values and need playtesting.
