# Engine Guide: Game Loop, Input Router & Telemetry

Owner: Rhian

These two files run the Explore screen. (The finished wiring is `src/screens/ExploreScreen.tsx`, and the rules of a flight are in `GAMEPLAY.md`.) They import nothing from the rest of the project, so other modules plug into them using the functions below.

| File | What it contains |
|---|---|
| `gameLoop.ts` | `GameLoop`: 60 FPS fixed-timestep loop, slow-mo easing (1.0 ↔ 0.25), canvas drawing order |
| `inputRouter.ts` | `InputRouter`: WASD/Arrow movement during flight, name typing during scans, movement lock |
| `inputRouter.ts` | `ScanTelemetry`: WPM, scan accuracy, free-error allowance |

## Phases

| Phase | Movement keys | Typing | Game speed |
|---|---|---|---|
| `APPROACH` | Active | Ignored | 100% |
| `SCAN` | Locked | Matched against the body's name | Eases to 25% |
| `RESUME` | Active again | Ignored | Eases back to 100% |

## Wiring it up (for `ExploreScreen.tsx`)

```ts
import { GameLoop } from '../engine/gameLoop';
import { InputRouter, ScanTelemetry } from '../engine/inputRouter';

const telemetry = new ScanTelemetry({ errorAllowance: 0 }); // free errors from the Laser part
const router = new InputRouter({ telemetry });
const loop = new GameLoop({
  canvas, // the <canvas> element
  onTimeScaleSettled: (scale) => {
    if (scale === 1) router.finishResume(); // RESUME -> APPROACH
  },
});

// The phase drives slow-mo
router.on('phase', ({ phase }) => (phase === 'SCAN' ? loop.enterSlowMo() : loop.exitSlowMo()));

// Keep the WPM clock running (real seconds, not slow-mo seconds)
loop.addSystem('telemetry', (step) => telemetry.tick(step.realDt));

router.attach();
loop.start();

// When the screen unmounts:
router.detach();
loop.stop();
```

## For each teammate

### Vinea — physics and spawner

Register your update code as a system. It runs 60 times per second.

```ts
loop.addSystem('physics', (step) => {
  const move = router.getMovement(); // { x, y }, each -1..1, zero while movement is locked
  // Multiply all motion by step.dt so slow-mo applies automatically.
}, 20);
```

- `step.dt` is game seconds (already slowed during scans). Use it for all world motion.
- `step.realDt` is real seconds (always 1/60). Use it for timers that should ignore slow-mo.
- Lower order numbers run first, e.g. spawner 10, physics 20, collisions 30.
- When a body enters antenna range, call `router.beginScan('Titan')`.
- `router.isMovementLocked()` is true during a scan (pause spawning, make the satellite invulnerable).

### Vic and whoever draws on the canvas

Register drawing code as a layer. Lower order numbers are drawn first (further back).

```ts
loop.addLayer('starfield', ({ ctx, width, height }) => { /* draw */ }, 0);
loop.addLayer('planets',   ({ ctx }) => { /* draw */ }, 10);
loop.addLayer('asteroids', ({ ctx }) => { /* draw */ }, 20);
loop.addLayer('satellite', ({ ctx }) => { /* draw */ }, 30);
```

- The canvas is already cleared, resized and scaled for high-DPI screens each frame.
- Draw in CSS pixels using `width` and `height`.
- Styles and transforms set inside one layer do not leak into the next.

### Ej — HUD, reticle and toast

```ts
router.on('scanStart', (p) => { /* show reticle with p.target */ });
router.on('scanKey', (e) => {
  // e.typed     = letters already matched (highlight these)
  // e.remaining = letters still to type
  // e.correct   = false on a wrong key
});
router.on('scanComplete', (e) => {
  // e.message = "Titan has been scanned"  (toast text)
  // e.result  = stats for this scan (wpm, accuracy, errors)
});

router.isMovementLocked(); // true -> show "MOVEMENT LOCKED — TYPE TO SCAN"
router.getScanProgress();  // current progress, or null when not scanning

const stats = telemetry.getSnapshot();
// stats.wpm, stats.accuracy (0..1, multiply by 100 for %),
// stats.allowanceRemaining, stats.scansCompleted, stats.perfectScans
```

### Ci — store and audio

```ts
router.on('scanKey', (e) => {
  if (!e.correct) { /* play the error thud */ }
});
router.on('scanComplete', (e) => { /* mark e.target as scanned in the store */ });

telemetry.setErrorAllowance(n); // free errors granted by the equipped Laser
telemetry.getSnapshot();        // final numbers to save for the outcome screens
```

On mission start or retry, call `router.reset()`, `telemetry.reset()` and `loop.reset()`.

## Rules worth knowing

- The WPM clock starts when a scan begins and only runs during scans. 5 correct characters = 1 word.
- The Laser's free errors refill at the start of every scan. Forgiven errors do not lower accuracy.
- A wrong key never resets progress.
- Names are matched case-insensitively. Players type letters, digits and hyphens; other characters (such as spaces) are skipped for them.
- Holding a key down during a scan does not repeat the character.
- Every `on(...)`, `addSystem(...)` and `addLayer(...)` call returns a function that removes it again.