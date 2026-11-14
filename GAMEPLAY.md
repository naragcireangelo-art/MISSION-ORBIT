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

## Around the flight

- **Intro and banners.** Each flight opens with a short level intro (the first flight ever adds a one-time tip about the steering lock). When a target appears a banner announces it ("Venus approaching"; hidden targets read "Unknown object").
- **Pause.** `Esc` opens the pause menu (Resume, Restart mission, Quit to Archive). Losing window focus pauses automatically. While paused the loop is frozen and the input router is detached, so typed letters cannot advance a scan behind the menu.
- **Feedback.** A hit flashes the screen red and throws sparks; losing the last hull point adds a shockwave. With reduced motion on, the flash is gentler and the sparks, shockwave and star drift are off.
- **Audio.** Chosen in the Sound Lab and all synthesized. Menu sounds (`src/engine/uiSounds.ts`): picking a mission is "Launch commit", Continue / Next is "Two-tone", and Play is "Short warp", each level-matched to the old chime. The flight swaps the menu synth for the "Pulse" score (`src/engine/flightMusic.ts`, D minor like the menu music): tempo follows the level's tier (84 to 110 BPM), kick and hats join as the field gets crowded, and during a scan it drops to half-time, darkens and sags in pitch with the slow motion. Scan and hit sounds, the hull-1 alarm and the header's mute button are wired through `audioManager`; pausing pauses the music.

## Part balance

Bodies trade hull against speed: Scout (hull 3, speed x1.15), Surveyor (hull 5, x1.0), Bulwark (hull 7, x0.8). Thrusters set the base speed (0.4 / 0.5 / 0.6 screen heights per second). The slowest build is Bulwark + Cold Gas at 0.32, and the spawner's safe lane is built for that speed. Antennas set scan range and score bonus; lasers set free typing errors.

## Not built yet

- Checkpoints after each scan (a loss restarts the level).
- What stars can be spent on, and part unlocks (`ENFORCE_PART_UNLOCKS` is off, so every part is free).
- Human playtest tuning: the numbers above were checked with a bot, which cannot say whether a level is fun.
