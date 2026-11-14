# Mission Orbit

An educational 2D space-flight arcade game built on real NASA missions. You assemble and name a research
satellite, read the launch-day briefing for a historical mission, then fly it through an asteroid field and
**type the name of each planet or moon to scan it**. Nine missions, from Mariner 10 (1973) to the James Webb
Space Telescope (2021).

Desktop browsers with a physical keyboard only.

## Run it

You need [Node.js](https://nodejs.org) (an LTS version).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check, then make a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm test` | Run the tests (game rules, fairness bot, content data) |

Dev-only URL switches (ignored in production builds):

- `?unlock-all` opens every level in the Mission Archive.
- `?sound-lab` opens a page for auditioning sound-effect and music candidates (not part of the game).

## How to play

1. **Archive**: pick a mission. Levels unlock in order; finish one to open the next.
2. **Assembly**: choose an antenna, laser, body and thruster, and name your satellite (1–16 characters).
3. **Briefing**: read the NASA launch log. `Space` skips the typing effect.
4. **Objectives**: check readiness and the list of worlds to scan, then press Play.
5. **Explore**: dodge the asteroids, then scan each target.

| Key | In flight | During a scan |
|---|---|---|
| `W A S D` / arrow keys | Steer | Locked |
| Letters, digits, `-` | Ignored | Type the target's name |
| `Esc` | Pause menu | Pause menu |

When a target comes into range, time slows to 25%, the ship becomes untouchable, and steering locks while you
type the name. Finish it and the game speeds back up. Scan every target to complete the mission; if hull
reaches 0 you lose signal and can retry.

Stars: one for finishing, one for 90% scan accuracy or better, one for ending with at least half your hull.

## Project layout

```
src/
  art/          Vector artwork drawn on canvas: satellite parts, asteroids, starfield
  components/   assembly/ archive/ flight/ outcome/ ui/ (planet art, frame, rail, codex)
  data/         missions, celestial bodies, Codex entries, satellite parts
  engine/       game loop, input router, flight physics, spawner, flight simulation, audio
  screens/      one file per screen (Splash, Archive, Assembly, Briefing, Objectives, Explore, ...)
  store/        Zustand stores: game progress, satellite build, outcome reports
  styles/       CSS
```

## More documentation

- [GAMEPLAY.md](GAMEPLAY.md): the rules of a flight, tuning numbers and the fairness guarantee.
- [src/engine/ENGINE_GUIDE.md](src/engine/ENGINE_GUIDE.md): the game loop, input router and scan telemetry.
- [MISSIONORBIT.md](MISSIONORBIT.md): the product requirements document.

## Content and sources

All mission dates, times, vehicles and sites, and all body data, come from NASA pages. Each mission lists its
sources in `src/data/missions.ts`, and each body links to its NASA page in `src/data/celestialBodies.ts`. Numbers
match NASA's [planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). `npm test` checks that
every target has art, a Codex entry and a typable name, and that every source link is https.

This is an educational simulation inspired by real NASA missions. It is not an official NASA product.

## Tech

React 18, TypeScript, Vite, Zustand, HTML5 Canvas 2D, Howler.js plus a Web Audio synth, Vitest.
