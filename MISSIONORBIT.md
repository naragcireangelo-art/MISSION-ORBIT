# Product Requirements Document (PRD) — Mission Orbit 
**Target Platform:** Desktop Web (Physical Keyboard Required)  
**Tech Stack:** React 18 + TypeScript, HTML5 Canvas 2D (Smooth Vector Rendering), Zustand (State Management), Howler.js / Web Audio API  

---

## 1. Executive Summary & Core Concept

**Mission Orbit** is an educational 2D space-flight arcade game that blends asteroid-dodging navigation with type-to-scan mechanics. Players assemble and name a custom research satellite, review historical flight briefings built on real NASA mission archives, and pilot their craft through deep-space sectors across three chronological eras (1973–2021).

### Core Gameplay Loop (Evasion & Type-to-Scan)
* **Asteroid Avoidance (No Destruction):** Players **do not** shoot or destroy asteroids. Instead, players pilot their satellite using the **Arrow Keys** or **WASD** to weave through incoming asteroid fields.
* **Celestial Encounters & Scan Phase:** As the player survives the asteroid belt, moons and planets drift into scanner range carrying a visible name label. Entering range slows the game world down and locks the player's movement keys (`WASD` / `Arrows`) so typing does not accidentally steer the ship.
* **Type-to-Scan & Unlock:** The player types the planet or moon's name to scan it. Once completed, a side notification pops up reading **`[PlanetName] has been scanned`** alongside a Science Log summary, the game returns to normal speed, and the player's movement keys immediately unlock to continue flying.

---

## 2. Visual Direction & Art Style

* **Smooth Vector Aesthetics:** All spacecraft components (chassis, antennas, laser rangefinders, thrusters), rotating planets, moons, parallax starfields, and asteroid hazards are rendered as crisp, scalable **smooth vector graphics** (SVG paths rasterized onto HTML5 Canvas 2D).
* **Mission-Control UI:** Framed inside a clean, high-contrast telemetry interface featuring a 6-step mission progress rail (`01 Archive` → `02 Assembly` → `03 Briefing` → `04 Objectives` → `05 Explore` → `06 Outcome`), live spacecraft health readouts, and DSN uplink indicators.

---

## 3. Core User Flow & State Machine

The application manages nine distinct screens via a centralized Zustand store (`currentScreen`):

```
[Splash Screen] ──> [Mission Archive (Era Tabs)] ──> [Assembly (Builder)] ──> [Briefing] ──> [Objectives]
                                                                                                   │
     ┌─────────────────────────────────────────────────────────────────────────────────────────────┘
     ▼
[Explore: Approach (Dodge)] ──(Body in Range)──> [Explore: Scan (Slow-Mo + Keys Locked)]
     ▲                                                             │
     └────(Scan Complete: Side Notif + Normal Speed + Unlock)──────┘
     │
     ├──(All Targets Scanned)──> [Mission Complete] ──(If Mission 9)──> [Outro / Credits]
     │
     └──(Hull Reaches 0)───────> [Signal Lost] ──> (Retry / Return to Archive)
```

---

## 4. Screen-by-Screen Functional Requirements

### 4.1 Splash Screen
* **Visuals:** Full-viewport animated deep-space starfield with a smooth-vector rotating Earth, drifting asteroids, and the **MISSION ORBIT** emblem.
* **Entry & Audio:** Pressing `Enter`, `Space`, or clicking initializes the Web Audio context, fades in the ambient synth soundtrack, and transitions to the Mission Archive. Includes a corner Mute toggle and a **Celestial Codex** viewer.

### 4.2 Mission Archive (Chronological Era Folders)
* **Era Folder Tabs:** Missions are strictly ordered **chronologically by NASA launch date** across three era folders:
  * `1970s – 1980s` (5 Missions)
  * `1990s – 2000s` (2 Missions)
  * `2010s – 2020s` (2 Missions)
* **Mission Dossier Cards:** Each folder displays the mission title, mission code (`SAT-001` through `SAT-009`), target region tag, **exact NASA launch date**, and lock/completion status.

### 4.3 Assembly (Satellite Staging & Naming)
* **Live Vector Preview:** Interactive grid displaying the assembled satellite in real time as components are swapped.
* **Modular Components (4 Slots):**
  1. **Body (Chassis):** Determines Max Hull Integrity (how many asteroid collisions the satellite can withstand) and base mass.
  2. **Antenna (Deep-Space Array):** Increases celestial scan trigger range (allowing earlier scan lock-on) and scan score multipliers.
  3. **Laser (LiDAR Rangefinder):** Acts as a precision mapping/targeting aid—grants free-error allowances during typing scans without losing accuracy bonuses (does *not* destroy asteroids).
  4. **Thruster (Maneuvering System):** Determines flight speed and acceleration when dodging asteroids with `WASD` / `Arrows`.
* **Satellite Naming:** Custom text input (1–16 characters) pre-filled with a callsign based on the mission's spacecraft (e.g., `MARINER-II`).

### 4.4 Mission Briefing (NASA Launch Log)
* **Historical Context:** Displays the target celestial body alongside an incoming transmission detailing the **exact NASA launch date, launch vehicle, launch site**, and what humanity knew on the day the spacecraft left Earth.
* **Controls:** Scrollable transmission text with `Skip Transmission`, `Next` (to Objectives), and `Back` (to Assembly).

### 4.5 Objectives Screen
* **Checklist & Telemetry:** Lists every moon and planet required for the mission (e.g., *Document Titan*, *Document Enceladus*) and displays spacecraft readiness before launching into `Explore`.

### 4.6 Explore Screen (Gameplay)
* **Phase 1 — Approach (Asteroid Evasion):**
  * Side-scrolling 2D flight view. The player steers freely using **Arrow Keys** or **WASD** to dodge incoming vector asteroids.
  * Typing keys are ignored during flight so `W`, `A`, `S`, and `D` operate purely as movement controls.
  * Colliding with an asteroid deducts `1 Hull`, triggers brief invulnerability frames, and lowers DSN Signal Strength. Near misses award bonus points.
* **Phase 2 — Scan (Time-Slow & Movement Lock):**
  * When a target planet or moon scrolls into the Antenna's scan range, the world smoothly decelerates to **25% speed**, asteroid spawning pauses, and the satellite becomes invulnerable.
  * **Movement Keys Locked:** Arrow keys and `WASD` are temporarily locked (indicated by a `MOVEMENT LOCKED — TYPE TO SCAN` HUD badge) so the player can type freely.
  * **Typing Mechanic:** The celestial body's name appears on the scan reticle. Typing each letter highlights progress in real time. Mistyped keys play an error thud without resetting progress.
* **Phase 3 — Scan Complete & Resume:**
  * Upon typing the final letter, a slide-in side notification displays: **`[PlanetName] has been scanned`** along with a brief NASA Science Log card (diameter, orbital distance, and key discovery fact).
  * The game smoothly accelerates back to **100% normal speed**, and **Arrow Keys / WASD immediately unlock** so the player can resume dodging asteroids toward the next target.
* **Win / Loss Conditions:**
  * **Mission Complete:** All required moons/planets in the mission are scanned.
  * **Signal Lost:** Satellite Hull Integrity reaches `0` from asteroid impacts.

### 4.7 Outcome Screens & Outro
* **Mission Complete:** Displays scan accuracy, typing WPM (measured strictly during scan phases), near-miss count, star rating, and a **Historical Discovery Unlocked** card sourced from NASA archives.
* **Signal Lost:** Displays cause of connection loss, incomplete scan checklist, `Retry Connection` (restarts with the same satellite build), and `Return to Missions`.
* **Campaign Outro (After Mission 9):** Summarizes total asteroids dodged, all 9 missions' scanned worlds, career WPM, and closes with a tribute inspired by Voyager 1's *Pale Blue Dot*.

---

## 5. Campaign Structure: 9 Chronological NASA Missions

All missions are ordered strictly by their real-world **NASA launch dates**, expanding the campaign to 9 levels (including NASA's *Magellan* Venus radar mapper).

### Era Folder 1: `Missions Launched: 1970s – 1980s`

| Lvl | Mission Title (Code) | Spacecraft | NASA Launch Date & Vehicle | Targets to Scan (In Order) | Historical Knowledge Imparted (NASA Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Mercury Mission** (`SAT-001`) | **Mariner 10** | **Nov 3, 1973** *(05:45 UTC)* · Atlas-Centaur, Cape Canaveral LC-36B | `Venus`, `Mercury` | First spacecraft to use an interplanetary gravity assist (via Venus) to reach Mercury, completing three flybys in 1974–1975 to map its cratered terrain. |
| **02** | **Mars Mission** (`SAT-002`) | **Viking 1** | **Aug 20, 1975** *(21:22 UTC)* · Titan IIIE-Centaur, Cape Canaveral LC-41 | `Mars`, `Phobos`, `Deimos` | Launched on an 11-month voyage to Mars; its lander touched down on Chryse Planitia on July 20, 1976, transmitting the first photograph taken from the Martian surface. |
| **03** | **Ice Giants Mission** (`SAT-003`) | **Voyager 2** | **Aug 20, 1977** *(14:29 UTC)* · Titan IIIE-Centaur, Cape Canaveral LC-41 | `Jupiter`, `Saturn`, `Uranus`, `Neptune`, `Triton` | Launched 16 days *before* Voyager 1 on a trajectory taking advantage of a rare 175-year planetary alignment; remains the only spacecraft to visit Uranus (1986) and Neptune (1989). |
| **04** | **Gas Giants Mission** (`SAT-004`) | **Voyager 1** | **Sep 5, 1977** *(12:56 UTC)* · Titan IIIE-Centaur, Cape Canaveral LC-41 | `Jupiter`, `Io`, `Saturn`, `Titan` | Launched on a faster path than its twin, reaching Jupiter in March 1979 (discovering active sulfur volcanoes on Io) and Saturn in November 1980 before heading toward interstellar space. |
| **05** | **Venus Mission** (`SAT-005`) | **Magellan** | **May 4, 1989** *(18:47 UTC)* · Space Shuttle Atlantis (STS-30) / IUS, KSC LC-39B | `Earth`, `Venus` | First planetary spacecraft launched from a Space Shuttle; entered Venus orbit on Aug 10, 1990 and used synthetic aperture radar to map 98% of the planet's cloud-shrouded surface. |

### Era Folder 2: `Missions Launched: 1990s – 2000s`

| Lvl | Mission Title (Code) | Spacecraft | NASA Launch Date & Vehicle | Targets to Scan (In Order) | Historical Knowledge Imparted (NASA Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **06** | **Saturn Mission** (`SAT-006`) | **Cassini-Huygens** | **Oct 15, 1997** *(08:43 UTC)* · Titan IVB/Centaur, Cape Canaveral SLC-40 | `Titan`, `Enceladus`, `Rhea`, `Mimas`, `Iapetus`, `Dione`, `Tethys` | Joint NASA/ESA/ASI mission that orbited Saturn for 13 years, landing the Huygens probe on Titan (Jan 2005) and discovering icy water plumes erupting from Enceladus. |
| **07** | **Pluto Mission** (`SAT-007`) | **New Horizons** | **Jan 19, 2006** *(19:00 UTC)* · Atlas V 551, Cape Canaveral SLC-41 | `Jupiter`, `Pluto`, `Charon` | Fastest spacecraft ever launched from Earth, crossing the Moon's orbit in just 9 hours and executing the first reconnaissance flyby of Pluto and Charon on July 14, 2015. |

### Era Folder 3: `Missions Launched: 2010s – 2020s`

| Lvl | Mission Title (Code) | Spacecraft | NASA Launch Date & Vehicle | Targets to Scan (In Order) | Historical Knowledge Imparted (NASA Reference) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **08** | **Jupiter Polar Mission** (`SAT-008`) | **Juno** | **Aug 5, 2011** *(16:25 UTC)* · Atlas V 551, Cape Canaveral SLC-41 | `Jupiter`, `Ganymede`, `Europa`, `Io` | First solar-powered spacecraft to operate at Jupiter's distance from the Sun; entered polar orbit on July 4, 2016 to peer beneath Jupiter's dense cloud tops and map its magnetosphere. |
| **09** | **Deep Field Mission** (`SAT-009`) | **James Webb Space Telescope** | **Dec 25, 2021** *(12:20 UTC)* · Ariane 5 ECA, Kourou ELA-3 | `WASP-39b` | Launched on Christmas Day to Sun–Earth Lagrange Point 2 (1.5 million km away) with an 18-segment gold-plated beryllium mirror to capture infrared light from the earliest galaxies and exoplanet atmospheres. |

---

## 6. Technical Architecture & State Management

### 6.1 Directory Structure
```text
src/
├── art/                  # Clean SVG vector paths for satellites, planets, moons & asteroids
├── components/
│   ├── archive/          # EraTabs, MissionDossierCard, LaunchDateBadge
│   ├── assembly/         # VectorSatellitePreview, PartSlotSelector, NameInput
│   ├── flight/           # VectorCanvas, MissionHud, ScanReticle, ScanSideToast
│   └── ui/               # ProgressRail, ScrollableTransmission, ChecklistItem
├── screens/
│   ├── SplashScreen.tsx
│   ├── MissionArchiveScreen.tsx
│   ├── AssemblyScreen.tsx
│   ├── BriefingScreen.tsx
│   ├── ObjectivesScreen.tsx
│   ├── ExploreScreen.tsx
│   ├── MissionCompleteScreen.tsx
│   ├── SignalLostScreen.tsx
│   └── OutroScreen.tsx
├── engine/
│   ├── gameLoop.ts       # 60 FPS fixed-timestep loop with timeScale easing (1.0 <-> 0.25)
│   ├── inputRouter.ts    # Phase-aware keyboard router (WASD/Arrows vs. Scan typing)
│   ├── flightPhysics.ts  # Smooth vector velocity, bounds clamping & collision detection
│   ├── spawner.ts        # Asteroid belt generator with guaranteed safe flight corridors
│   └── audioManager.ts   # Web Audio / Howler.js SFX & adaptive music controller
├── data/
│   ├── missions.ts       # 9 chronological missions with NASA launch metadata & citations
│   ├── celestialBodies.ts# Planet/moon vector configs, dimensions & NASA Science Log facts
│   └── parts.ts          # Body, Antenna, Laser (LiDAR), and Thruster stats
└── store/
    └── useGameStore.ts   # Zustand store for screen state, satellite config & localStorage persistence
```

### 6.2 Input Routing & Movement Lock Logic (`inputRouter.ts`)
* **During `APPROACH` / `RESUME` Phases:**
  * Active listeners track `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`.
  * Standard letter keystrokes do not trigger scan inputs.
* **Transition to `SCAN` Phase:**
  * All held movement keys are immediately flushed (`heldKeys.clear()`) so the satellite halts cleanly without drifting.
  * Movement inputs are ignored while `phase === 'SCAN'`, and alphanumeric/hyphen keystrokes are routed exclusively to the active celestial body's name matcher.
* **Scan Completion:**
  * Fires the side notification event (`"${target.name} has been scanned"`), sets `targetTimeScale = 1.0`, and immediately re-enables `Arrow` and `WASD` movement listeners.

---

## 7. Official NASA Historical References

All launch dates, launch vehicles, launch sites, and discovery summaries in Section 5 are verified against official NASA mission archives:

1. **Mariner 10:** [NASA Science — Mariner 10](https://science.nasa.gov/mission/mariner-10/) & [NASA History — Mariner 10](https://www.nasa.gov/history/45-years-ago-mariner-10-off-to-venus-and-mercury/)
2. **Viking 1:** [NASA Science — Viking 1](https://science.nasa.gov/mission/viking-1/)
3. **Voyager 2:** [NASA Science — Voyager 2](https://science.nasa.gov/mission/voyager/voyager-2/) & [NASA Planetary Voyage](https://science.nasa.gov/mission/voyager/planetary-voyage/)
4. **Voyager 1:** [NASA Science — Voyager 1](https://science.nasa.gov/mission/voyager/voyager-1/) & [NASA NSSDCA Voyager Archive](https://nssdc.gsfc.nasa.gov/planetary/voyager.html)
5. **Magellan:** [NASA Science — Magellan](https://science.nasa.gov/mission/magellan/) & [NASA STS-30 Archive](https://www.nasa.gov/mission/sts-30/)
6. **Cassini-Huygens:** [NASA Science — Cassini](https://science.nasa.gov/mission/cassini/)
7. **New Horizons:** [NASA Science — New Horizons](https://science.nasa.gov/mission/new-horizons/)
8. **Juno:** [NASA Science — Juno](https://science.nasa.gov/mission/juno/) & [NASA JPL Juno Press Kit](https://www.jpl.nasa.gov/news/press_kits/juno/facts/)
9. **James Webb Space Telescope:** [NASA Science — Webb](https://science.nasa.gov/mission/webb/)
