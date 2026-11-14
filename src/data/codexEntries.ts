/**
 * codexEntries.ts — Content for the Celestial Codex viewer (every scannable target in the campaign).
 *
 * One entry per name the player can be asked to type. `scanName` is the exact target
 * string used in missions.ts, so the Codex can show which worlds have been scanned.
 * Sizes and distances are rounded NASA reference values.
 *
 * This file has no dependencies.
 */

/** Which picture to draw for an entry. Spheres are rendered by PlanetSphere; the rest by DeepSkyArt. */
export type BodyArtId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'phobos'
  | 'deimos'
  | 'jupiter'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'saturn'
  | 'titan'
  | 'enceladus'
  | 'rhea'
  | 'mimas'
  | 'iapetus'
  | 'dione'
  | 'tethys'
  | 'uranus'
  | 'neptune'
  | 'triton'
  | 'pluto'
  | 'charon'
  | 'wasp39b'
  | 'webb'
  | 'carina'
  | 'stephan';

export type CodexGroup = 'planets' | 'moons' | 'deepsky';

export interface CodexEntry {
  /** Exact target name used in missions.ts (what the player types). */
  scanName: string;
  /** Display name. */
  title: string;
  /** Short type label, e.g. "MOON OF SATURN". */
  kind: string;
  group: CodexGroup;
  art: BodyArtId;
  /** Three quick stats shown as label / value pairs. */
  stats: [string, string][];
  /** Science Log summary. */
  fact: string;
}

export const CODEX_GROUPS: { id: CodexGroup; label: string }[] = [
  { id: 'planets', label: 'Planets' },
  { id: 'moons', label: 'Moons' },
  { id: 'deepsky', label: 'Deep Sky' },
];

export const CODEX_ENTRIES: CodexEntry[] = [
  // ── Planets & dwarf planets ────────────────────────────────────────────────
  {
    scanName: 'Mercury',
    title: 'Mercury',
    kind: 'PLANET · INNERMOST',
    group: 'planets',
    art: 'mercury',
    stats: [
      ['Diameter', '4,879 km'],
      ['Distance from Sun', '57.9 million km (0.39 AU)'],
      ['Year length', '88 Earth days'],
    ],
    fact: 'Mariner 10 was the first spacecraft to visit Mercury, imaging about 45% of its surface: a heavily cratered world that swings between scorching days and freezing nights.',
  },
  {
    scanName: 'Venus',
    title: 'Venus',
    kind: 'PLANET',
    group: 'planets',
    art: 'venus',
    stats: [
      ['Diameter', '12,104 km'],
      ['Distance from Sun', '108.2 million km (0.72 AU)'],
      ['Surface temperature', 'about 465 °C'],
    ],
    fact: 'Venus is wrapped in thick clouds and has a surface hot enough to melt lead. Magellan’s radar saw through the clouds and mapped 98% of the surface.',
  },
  {
    scanName: 'Earth',
    title: 'Earth',
    kind: 'PLANET · HOME PORT',
    group: 'planets',
    art: 'earth',
    stats: [
      ['Diameter', '12,742 km (mean)'],
      ['Distance from Sun', '149.6 million km (1 AU)'],
      ['Moons', '1'],
    ],
    fact: 'Every mission in the archive began here. Spacecraft often swing past Earth for a gravity boost: Cassini did it in August 1999 on its way to Saturn.',
  },
  {
    scanName: 'Mars',
    title: 'Mars',
    kind: 'PLANET',
    group: 'planets',
    art: 'mars',
    stats: [
      ['Diameter', '6,779 km'],
      ['Distance from Sun', '227.9 million km (1.52 AU)'],
      ['Moons', '2 (Phobos, Deimos)'],
    ],
    fact: 'Viking 1’s lander touched down on Chryse Planitia on July 20, 1976 and returned the first clear photograph from the Martian surface. Mars is home to Olympus Mons, the largest volcano in the Solar System.',
  },
  {
    scanName: 'Jupiter',
    title: 'Jupiter',
    kind: 'GAS GIANT',
    group: 'planets',
    art: 'jupiter',
    stats: [
      ['Diameter', '142,984 km (equatorial)'],
      ['Distance from Sun', '778 million km (5.2 AU)'],
      ['Day length', 'about 10 hours'],
    ],
    fact: 'The largest planet in the Solar System. The Great Red Spot is a storm larger than Earth. Voyager 1 passed Jupiter in March 1979; Juno entered polar orbit on July 4, 2016 (US time).',
  },
  {
    scanName: 'Saturn',
    title: 'Saturn',
    kind: 'GAS GIANT',
    group: 'planets',
    art: 'saturn',
    stats: [
      ['Diameter', '120,536 km (equatorial)'],
      ['Distance from Sun', '1.43 billion km (9.5 AU)'],
      ['Rings', 'Mostly water ice'],
    ],
    fact: 'Saturn’s rings are made mostly of water ice, from dust grains to house-sized chunks. Cassini orbited the planet for 13 years.',
  },
  {
    scanName: 'Uranus',
    title: 'Uranus',
    kind: 'ICE GIANT',
    group: 'planets',
    art: 'uranus',
    stats: [
      ['Diameter', '51,118 km (equatorial)'],
      ['Distance from Sun', '2.87 billion km (19.2 AU)'],
      ['Axial tilt', 'about 98°'],
    ],
    fact: 'Uranus rolls around the Sun on its side. Voyager 2 is the only spacecraft ever to visit it, flying past in January 1986.',
  },
  {
    scanName: 'Neptune',
    title: 'Neptune',
    kind: 'ICE GIANT',
    group: 'planets',
    art: 'neptune',
    stats: [
      ['Diameter', '49,528 km (equatorial)'],
      ['Distance from Sun', '4.5 billion km (30.1 AU)'],
      ['Peak winds', 'over 2,000 km/h'],
    ],
    fact: 'Voyager 2 reached Neptune in August 1989, the only spacecraft ever to do so. It found a Great Dark Spot and five new moons, and measured the fastest winds known in the Solar System.',
  },
  {
    scanName: 'Pluto',
    title: 'Pluto',
    kind: 'DWARF PLANET',
    group: 'planets',
    art: 'pluto',
    stats: [
      ['Diameter', '2,377 km'],
      ['Distance from Sun', '5.9 billion km (39.5 AU avg.)'],
      ['Moons', '5 known'],
    ],
    fact: 'New Horizons flew past Pluto on July 14, 2015, revealing mountains of water ice and a vast heart-shaped region named Tombaugh Regio, whose western half is a plain of nitrogen ice called Sputnik Planitia.',
  },

  // ── Moons ──────────────────────────────────────────────────────────────────
  {
    scanName: 'Phobos',
    title: 'Phobos',
    kind: 'MOON OF MARS',
    group: 'moons',
    art: 'phobos',
    stats: [
      ['Size', '27 × 22 × 18 km'],
      ['Distance from Mars', '9,376 km from center'],
      ['Orbit', '7 h 39 min'],
    ],
    fact: 'Discovered by Asaph Hall in 1877. Phobos circles Mars about three times a day and is slowly spiraling inward.',
  },
  {
    scanName: 'Deimos',
    title: 'Deimos',
    kind: 'MOON OF MARS',
    group: 'moons',
    art: 'deimos',
    stats: [
      ['Size', '15 × 12 × 11 km'],
      ['Distance from Mars', '23,463 km from center'],
      ['Orbit', '30 h 18 min'],
    ],
    fact: 'The smaller, outer moon of Mars, discovered by Asaph Hall in 1877. A smooth blanket of loose dust hides many of its craters.',
  },
  {
    scanName: 'Io',
    title: 'Io',
    kind: 'MOON OF JUPITER',
    group: 'moons',
    art: 'io',
    stats: [
      ['Diameter', '3,643 km'],
      ['Distance from Jupiter', '421,800 km'],
      ['Orbit', '1.77 Earth days'],
    ],
    fact: 'Voyager 1 discovered active volcanoes on Io in March 1979, the first seen beyond Earth. It is the most volcanically active body in the Solar System.',
  },
  {
    scanName: 'Europa',
    title: 'Europa',
    kind: 'MOON OF JUPITER',
    group: 'moons',
    art: 'europa',
    stats: [
      ['Diameter', '3,122 km'],
      ['Distance from Jupiter', '671,100 km'],
      ['Orbit', '3.55 Earth days'],
    ],
    fact: 'A cracked shell of ice covers Europa, and evidence points to a global saltwater ocean beneath it.',
  },
  {
    scanName: 'Ganymede',
    title: 'Ganymede',
    kind: 'MOON OF JUPITER',
    group: 'moons',
    art: 'ganymede',
    stats: [
      ['Diameter', '5,268 km'],
      ['Distance from Jupiter', '1,070,400 km'],
      ['Orbit', '7.15 Earth days'],
    ],
    fact: 'The largest moon in the Solar System, bigger than the planet Mercury, and the only moon known to generate its own magnetic field.',
  },
  {
    scanName: 'Titan',
    title: 'Titan',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'titan',
    stats: [
      ['Diameter', '5,150 km'],
      ['Distance from Saturn', '1.22 million km'],
      ['Orbit', '15.9 Earth days'],
    ],
    fact: 'The Huygens probe landed on Titan on January 14, 2005. Beneath its thick orange haze are lakes and seas of liquid methane and ethane.',
  },
  {
    scanName: 'Enceladus',
    title: 'Enceladus',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'enceladus',
    stats: [
      ['Diameter', '504 km'],
      ['Distance from Saturn', '238,000 km'],
      ['Orbit', '1.37 Earth days'],
    ],
    fact: 'Cassini discovered icy water plumes erupting from Enceladus’s south pole, fed by a hidden ocean beneath its shell of ice.',
  },
  {
    scanName: 'Rhea',
    title: 'Rhea',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'rhea',
    stats: [
      ['Diameter', '1,527 km'],
      ['Distance from Saturn', '527,100 km'],
      ['Orbit', '4.52 Earth days'],
    ],
    fact: 'Saturn’s second-largest moon, a heavily cratered ball made mostly of water ice.',
  },
  {
    scanName: 'Mimas',
    title: 'Mimas',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'mimas',
    stats: [
      ['Diameter', '396 km'],
      ['Distance from Saturn', '185,500 km'],
      ['Orbit', '0.94 Earth days'],
    ],
    fact: 'Herschel Crater, about 130 km across, is roughly a third of Mimas’s entire width, which makes this small icy moon one of the most striking sights in the Saturn system.',
  },
  {
    scanName: 'Iapetus',
    title: 'Iapetus',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'iapetus',
    stats: [
      ['Diameter', '1,469 km'],
      ['Distance from Saturn', '3.56 million km'],
      ['Orbit', '79.3 Earth days'],
    ],
    fact: 'Iapetus is two-faced: one hemisphere is as dark as coal and the other as bright as fresh snow.',
  },
  {
    scanName: 'Dione',
    title: 'Dione',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'dione',
    stats: [
      ['Diameter', '1,123 km'],
      ['Distance from Saturn', '377,400 km'],
      ['Orbit', '2.74 Earth days'],
    ],
    fact: 'A moon of water ice and rock. Cassini showed that the bright “wisps” on its trailing side are really towering ice cliffs.',
  },
  {
    scanName: 'Tethys',
    title: 'Tethys',
    kind: 'MOON OF SATURN',
    group: 'moons',
    art: 'tethys',
    stats: [
      ['Diameter', '1,062 km'],
      ['Distance from Saturn', '294,600 km'],
      ['Orbit', '1.89 Earth days'],
    ],
    fact: 'Almost pure water ice. Its huge Odysseus crater spans more than a third of the moon’s diameter, and the canyon Ithaca Chasma runs about 2,000 km across its surface.',
  },
  {
    scanName: 'Triton',
    title: 'Triton',
    kind: 'MOON OF NEPTUNE',
    group: 'moons',
    art: 'triton',
    stats: [
      ['Diameter', '2,707 km'],
      ['Distance from Neptune', '354,800 km'],
      ['Orbit', '5.88 Earth days (backward)'],
    ],
    fact: 'Triton orbits Neptune backward, which suggests it was captured from the Kuiper Belt. Voyager 2 spotted dark plumes of nitrogen gas erupting from its surface in 1989.',
  },
  {
    scanName: 'Charon',
    title: 'Charon',
    kind: 'MOON OF PLUTO',
    group: 'moons',
    art: 'charon',
    stats: [
      ['Diameter', '1,212 km'],
      ['Distance from Pluto', 'about 19,600 km'],
      ['Orbit', '6.39 Earth days'],
    ],
    fact: 'Charon is about half the size of Pluto. The pair are so closely matched that they orbit a point in space between them. Its reddish north pole is called Mordor Macula.',
  },

  // ── Deep sky ───────────────────────────────────────────────────────────────
  {
    scanName: 'Webb',
    title: 'James Webb Space Telescope',
    kind: 'SPACE TELESCOPE',
    group: 'deepsky',
    art: 'webb',
    stats: [
      ['Mirror', '6.5 m, 18 gold-plated segments'],
      ['Station', 'Sun–Earth L2, 1.5 million km away'],
      ['Observes', 'Infrared light'],
    ],
    fact: 'Webb unfolded itself in space after launching on Christmas Day 2021. A five-layer sunshield about the size of a tennis court keeps its instruments cold enough to see faint infrared light.',
  },
  {
    scanName: 'Carina',
    title: 'Carina Nebula',
    kind: 'STAR-FORMING NEBULA',
    group: 'deepsky',
    art: 'carina',
    stats: [
      ['Type', 'Emission nebula'],
      ['Distance', 'about 7,600 light-years'],
      ['Constellation', 'Carina'],
    ],
    fact: 'A star-forming region in the southern sky. One of Webb’s first science images, released in July 2022, shows its “Cosmic Cliffs” and young stars that were hidden inside clouds of dust.',
  },
  {
    scanName: 'Stephan',
    title: 'Stephan’s Quintet',
    kind: 'COMPACT GALAXY GROUP',
    group: 'deepsky',
    art: 'stephan',
    stats: [
      ['Type', 'Galaxy group'],
      ['Distance', 'about 290 million light-years (four of five)'],
      ['Constellation', 'Pegasus'],
    ],
    fact: 'Discovered by Édouard Stephan in 1877. Four of its five galaxies are caught in a cosmic dance of close encounters; the fifth is a foreground galaxy about 40 million light-years away. Webb imaged the group in infrared in July 2022.',
  },
  {
    scanName: 'WASP-39b',
    title: 'WASP-39b',
    kind: 'HOT GAS-GIANT EXOPLANET',
    group: 'deepsky',
    art: 'wasp39b',
    stats: [
      ['Type', 'Hot gas giant'],
      ['Distance', 'about 700 light-years'],
      ['Orbit', 'About 4 Earth days'],
    ],
    fact: 'In 2022 Webb made the first clear detection of carbon dioxide in the atmosphere of a planet outside our Solar System.',
  },
];

const BY_SCAN_NAME = new Map<string, CodexEntry>(CODEX_ENTRIES.map((e) => [e.scanName.toLowerCase(), e]));

export function getCodexEntry(scanName: string | null | undefined): CodexEntry | undefined {
  return scanName ? BY_SCAN_NAME.get(scanName.toLowerCase()) : undefined;
}
