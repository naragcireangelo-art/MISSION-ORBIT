/**
 * missions.ts — the 9-mission campaign, in launch-date order (PRD section 8).
 *
 * Launch dates, times, vehicles and sites come from NASA mission pages (see
 * `sources` on each mission). All copy below is paraphrased for the game and
 * still needs the second-reviewer sign-off in PRD 8.4 before content lock.
 *
 * CONTENT STATUS — confirm against NASA pages before lock:
 *  - Voyager 1 launch time (12:56 UTC) and pad (LC-41)
 *  - Magellan "98% of the surface" mapping figure
 *  - Mission 9 scan targets (Webb, Carina, Stephan, WASP-39b) are deep-field
 *    objects rather than planets or moons; confirm this is intended.
 */

import { getBody } from './celestialBodies';

export type Tier = 1 | 2 | 3 | 4;
export type EraTab = '1970s-1980s' | '1990s-2000s' | '2010s-2020s';

export interface EraTabInfo {
  id: EraTab;
  /** Folder label shown in the Mission Archive. */
  label: string;
  blurb: string;
  firstYear: number;
  lastYear: number;
}

export const ERA_TABS: readonly EraTabInfo[] = [
  {
    id: '1970s-1980s',
    label: 'Missions Launched: 1970s – 1980s',
    blurb: 'The Golden Age of Planetary Flybys',
    firstYear: 1970,
    lastYear: 1989,
  },
  {
    id: '1990s-2000s',
    label: 'Missions Launched: 1990s – 2000s',
    blurb: 'Orbital Surveyors & Deep Probes',
    firstYear: 1990,
    lastYear: 2009,
  },
  {
    id: '2010s-2020s',
    label: 'Missions Launched: 2010s – 2020s',
    blurb: 'Modern Frontiers & Ice Worlds',
    firstYear: 2010,
    lastYear: 2029,
  },
];

export interface MissionObjective {
  id: string;
  /** Checklist text, e.g. "Document Titan". */
  label: string;
  /** Bodies that must be scanned to tick this objective. */
  targetIds: readonly string[];
}

export interface BriefingTarget {
  /** Upper-case name shown on the Target Acquired panel. */
  title: string;
  /** Designation line, e.g. "SOL VI". */
  designation: string;
  /** Mean distance from the Sun in AU, shown as RANGE. */
  rangeAu: number;
  /** Body drawn large in the briefing view. */
  bodyId: string;
}

export interface MissionSource {
  label: string;
  url: string;
}

export interface MissionData {
  id: string;
  /** SAT-001 ... SAT-009. */
  code: string;
  /** Folder card title, e.g. "Saturn Mission". */
  folderTitle: string;
  /** Region tag on the folder card, e.g. "OUTER PLANETS". */
  regionTag: string;
  eraTab: EraTab;
  /** 1-9, strictly in launch-date order. Drives unlock order. */
  levelNumber: number;
  spacecraft: string;
  /** Prefix for the default satellite name: `${callsignBase}-II`. */
  callsignBase: string;
  /** ISO date, e.g. '1997-10-15'. Same date in UTC and US local time. */
  launchDateISO: string;
  launchTimeUTC: string;
  launchVehicle: string;
  launchSite: string;
  briefingTarget: BriefingTarget;
  /** Briefing copy: what the mission was and how it launched. */
  launchContext: string;
  /** Briefing copy: what humanity knew when it launched. */
  knownAtLaunch: string;
  /** Mission Complete "Historical Discovery Unlocked" copy. */
  discoveryFact: string;
  /** Headline on the Objectives screen, e.g. "Documented Saturn and its moons". */
  objectiveHeadline: string;
  objectives: readonly MissionObjective[];
  /** Scan targets in flight order. Every one is required to complete the mission. */
  targetIds: readonly string[];
  /** Targets shown as "?" (UNKNOWN) until their scan starts. */
  hiddenTargetIds?: readonly string[];
  tier: Tier;
  /** Seconds of Approach before each target (25-40). */
  segmentSeconds: number;
  sources: readonly MissionSource[];
}

// --- Difficulty -------------------------------------------------------------

export interface TierConfig {
  tier: Tier;
  label: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  /** Seconds for an asteroid to cross the screen, right edge to left edge. */
  crossingTimeS: number;
  spawnIntervalS: number;
  maxAsteroids: number;
  patterns: readonly string[];
  /** Typical scan-name length range. */
  scanNameLength: readonly [number, number];
}

/** Initial tuning values (PRD 7.5); to be validated in playtests. */
export const TIER_CONFIG: Readonly<Record<Tier, TierConfig>> = {
  1: {
    tier: 1, label: 'Easy', crossingTimeS: 8.0, spawnIntervalS: 1.4, maxAsteroids: 6,
    patterns: ['single', 'wide-gap'], scanNameLength: [4, 7],
  },
  2: {
    tier: 2, label: 'Medium', crossingTimeS: 6.5, spawnIntervalS: 1.1, maxAsteroids: 8,
    patterns: ['single', 'pair', 'diagonal-stream'], scanNameLength: [5, 9],
  },
  3: {
    tier: 3, label: 'Hard', crossingTimeS: 5.5, spawnIntervalS: 0.9, maxAsteroids: 10,
    patterns: ['pair', 'cluster-gap', 'rotating-belt'], scanNameLength: [6, 9],
  },
  4: {
    tier: 4, label: 'Expert', crossingTimeS: 4.5, spawnIntervalS: 0.7, maxAsteroids: 12,
    patterns: ['cluster-gap', 'storm-wave', 'mixed-sizes'], scanNameLength: [7, 10],
  },
};

/** Ramp applied from the first to the last segment of a mission (PRD 7.5). */
export const DIFFICULTY_RAMP = 0.15;

// --- Helpers for authoring ---------------------------------------------------

const perTarget = (ids: readonly string[]): MissionObjective[] =>
  ids.map((id) => ({
    id: `doc-${id}`,
    label: `Document ${getBody(id)?.name ?? id}`,
    targetIds: [id],
  }));

const src = (label: string, url: string): MissionSource => ({ label, url });

// --- The campaign ---------------------------------------------------------------

export const MISSIONS: readonly MissionData[] = [
  {
    id: 'm01-mariner-10',
    code: 'SAT-001',
    folderTitle: 'Mercury Mission',
    regionTag: 'INNER PLANETS',
    eraTab: '1970s-1980s',
    levelNumber: 1,
    spacecraft: 'Mariner 10',
    callsignBase: 'MARINER',
    launchDateISO: '1973-11-03',
    launchTimeUTC: '05:45',
    launchVehicle: 'Atlas-Centaur',
    launchSite: 'Cape Canaveral, LC-36B',
    briefingTarget: { title: 'MERCURY', designation: 'SOL I', rangeAu: 0.39, bodyId: 'mercury' },
    launchContext:
      'Mariner 10 was the first spacecraft designed to use a gravity assist. After leaving Earth it flew past Venus to bend its path toward Mercury, then flew by Mercury three times, in March 1974, September 1974 and March 1975.',
    knownAtLaunch:
      'Mercury had only been seen from Earth as a bright dot near the Sun. No spacecraft had ever visited it.',
    discoveryFact:
      'First spacecraft to use an interplanetary gravity assist (via Venus) to reach Mercury, completing three flybys in 1974–1975 to map its cratered terrain.',
    objectiveHeadline: 'Documented Venus and Mercury',
    objectives: perTarget(['venus', 'mercury']),
    targetIds: ['venus', 'mercury'],
    tier: 1,
    segmentSeconds: 30,
    sources: [
      src('NASA Science: Mariner 10', 'https://science.nasa.gov/mission/mariner-10/'),
      src('NASA History: Mariner 10 off to Venus and Mercury', 'https://www.nasa.gov/history/45-years-ago-mariner-10-off-to-venus-and-mercury/'),
    ],
  },
  {
    id: 'm02-viking-1',
    code: 'SAT-002',
    folderTitle: 'Mars Mission',
    regionTag: 'INNER PLANETS',
    eraTab: '1970s-1980s',
    levelNumber: 2,
    spacecraft: 'Viking 1',
    callsignBase: 'VIKING',
    launchDateISO: '1975-08-20',
    launchTimeUTC: '21:22',
    launchVehicle: 'Titan IIIE-Centaur',
    launchSite: 'Cape Canaveral, LC-41',
    briefingTarget: { title: 'MARS', designation: 'SOL IV', rangeAu: 1.52, bodyId: 'mars' },
    launchContext:
      'Viking 1 left Cape Canaveral on a Titan IIIE-Centaur rocket and spent about 11 months crossing to Mars. The mission carried an orbiter and a lander, built to photograph the planet and study its soil.',
    knownAtLaunch:
      'Flyby and orbiting spacecraft had photographed Mars, but no mission had returned lasting data from its surface.',
    discoveryFact:
      'Viking 1\'s lander touched down on Chryse Planitia on July 20, 1976 and transmitted the first photograph taken from the surface of Mars.',
    objectiveHeadline: 'Documented Mars and its moons',
    objectives: perTarget(['mars', 'phobos', 'deimos']),
    targetIds: ['mars', 'phobos', 'deimos'],
    tier: 1,
    segmentSeconds: 30,
    sources: [src('NASA Science: Viking 1', 'https://science.nasa.gov/mission/viking-1/')],
  },
  {
    id: 'm03-voyager-2',
    code: 'SAT-003',
    folderTitle: 'Ice Giants Mission',
    regionTag: 'OUTER PLANETS',
    eraTab: '1970s-1980s',
    levelNumber: 3,
    spacecraft: 'Voyager 2',
    callsignBase: 'VOYAGER',
    launchDateISO: '1977-08-20',
    launchTimeUTC: '14:29',
    launchVehicle: 'Titan IIIE-Centaur',
    launchSite: 'Cape Canaveral, LC-41',
    briefingTarget: { title: 'NEPTUNE', designation: 'SOL VIII', rangeAu: 30.07, bodyId: 'neptune' },
    launchContext:
      'Voyager 2 launched on Aug 20, 1977, 16 days before its twin, Voyager 1. Its path took advantage of a rare planetary alignment, which let a single spacecraft visit all four giant planets.',
    knownAtLaunch:
      'Uranus and Neptune were faint dots in telescopes. No spacecraft had ever visited either planet.',
    discoveryFact:
      'Voyager 2 remains the only spacecraft to have visited Uranus (January 1986) and Neptune (August 1989), launched on a rare 175-year planetary alignment.',
    objectiveHeadline: 'Documented the four giant planets and Triton',
    objectives: perTarget(['jupiter', 'saturn', 'uranus', 'neptune', 'triton']),
    targetIds: ['jupiter', 'saturn', 'uranus', 'neptune', 'triton'],
    tier: 2,
    segmentSeconds: 32,
    sources: [
      src('NASA Science: Voyager 2', 'https://science.nasa.gov/mission/voyager/voyager-2/'),
      src('NASA Science: Planetary Voyage', 'https://science.nasa.gov/mission/voyager/planetary-voyage/'),
    ],
  },
  {
    id: 'm04-voyager-1',
    code: 'SAT-004',
    folderTitle: 'Gas Giants Mission',
    regionTag: 'OUTER PLANETS',
    eraTab: '1970s-1980s',
    levelNumber: 4,
    spacecraft: 'Voyager 1',
    callsignBase: 'VOYAGER',
    launchDateISO: '1977-09-05',
    launchTimeUTC: '12:56',
    launchVehicle: 'Titan IIIE-Centaur',
    launchSite: 'Cape Canaveral, LC-41',
    briefingTarget: { title: 'JUPITER', designation: 'SOL V', rangeAu: 5.2, bodyId: 'jupiter' },
    launchContext:
      'Voyager 1 launched on Sep 5, 1977, on a faster, shorter path than Voyager 2. Like its twin, it carries a Golden Record of sounds and images from Earth.',
    knownAtLaunch:
      'Only the Pioneer probes had visited Jupiter and Saturn, and they returned far less detail than Voyager was built to capture.',
    discoveryFact:
      'Voyager 1 reached Jupiter in March 1979, revealing active volcanoes on Io, and Saturn in November 1980 before heading toward interstellar space.',
    objectiveHeadline: 'Documented Jupiter, Saturn and their moons',
    objectives: perTarget(['jupiter', 'io', 'saturn', 'titan']),
    targetIds: ['jupiter', 'io', 'saturn', 'titan'],
    tier: 2,
    segmentSeconds: 32,
    sources: [
      src('NASA Science: Voyager 1', 'https://science.nasa.gov/mission/voyager/voyager-1/'),
      src('NASA NSSDCA: Voyager Project Information', 'https://nssdc.gsfc.nasa.gov/planetary/voyager.html'),
    ],
  },
  {
    id: 'm05-magellan',
    code: 'SAT-005',
    folderTitle: 'Venus Mission',
    regionTag: 'INNER PLANETS',
    eraTab: '1970s-1980s',
    levelNumber: 5,
    spacecraft: 'Magellan',
    callsignBase: 'MAGELLAN',
    launchDateISO: '1989-05-04',
    launchTimeUTC: '18:47',
    launchVehicle: 'Space Shuttle Atlantis (STS-30) with Inertial Upper Stage',
    launchSite: 'Kennedy Space Center, LC-39B',
    briefingTarget: { title: 'VENUS', designation: 'SOL II', rangeAu: 0.72, bodyId: 'venus' },
    launchContext:
      'Magellan was the first planetary spacecraft launched from a Space Shuttle. Atlantis released it from the payload bay on May 5, 1989 (UT), and it was built to see through the clouds of Venus with radar.',
    knownAtLaunch:
      'Thick clouds hide the surface of Venus from cameras, so its landscape could only be guessed at.',
    discoveryFact:
      'Entered Venus orbit on Aug 10, 1990 and used synthetic aperture radar to map 98% of the planet\'s cloud-shrouded surface.',
    objectiveHeadline: 'Documented Earth and Venus',
    objectives: perTarget(['earth', 'venus']),
    targetIds: ['earth', 'venus'],
    tier: 2,
    segmentSeconds: 35,
    sources: [
      src('NASA Science: Magellan', 'https://science.nasa.gov/mission/magellan/'),
      src('NASA: STS-30', 'https://www.nasa.gov/mission/sts-30/'),
    ],
  },
  {
    id: 'm06-cassini-huygens',
    code: 'SAT-006',
    folderTitle: 'Saturn Mission',
    regionTag: 'OUTER PLANETS',
    eraTab: '1990s-2000s',
    levelNumber: 6,
    spacecraft: 'Cassini-Huygens',
    callsignBase: 'CASSINI',
    launchDateISO: '1997-10-15',
    launchTimeUTC: '08:43',
    launchVehicle: 'Titan IVB/Centaur',
    launchSite: 'Cape Canaveral Air Force Station',
    briefingTarget: { title: 'SATURN', designation: 'SOL VI', rangeAu: 9.58, bodyId: 'saturn' },
    launchContext:
      'Cassini-Huygens was a joint NASA, ESA and ASI mission. It needed gravity assists from Venus, Earth and Jupiter to reach Saturn, where it arrived in July 2004 carrying ESA\'s Huygens probe.',
    knownAtLaunch:
      'Pioneer 11 and the Voyagers had flown past Saturn, but no spacecraft had ever stayed to orbit it.',
    discoveryFact:
      'Orbited Saturn for 13 years, landing the Huygens probe on Titan (Jan 2005) and discovering icy water plumes erupting from Enceladus.',
    objectiveHeadline: 'Documented Saturn and its moons',
    objectives: [
      ...perTarget(['titan', 'enceladus', 'rhea']),
      {
        id: 'doc-remaining-moons',
        label: 'Document the remaining moons',
        targetIds: ['mimas', 'iapetus', 'dione', 'tethys'],
      },
    ],
    targetIds: ['titan', 'enceladus', 'rhea', 'mimas', 'iapetus', 'dione', 'tethys'],
    hiddenTargetIds: ['dione', 'tethys'],
    tier: 2,
    segmentSeconds: 35,
    sources: [src('NASA Science: Cassini', 'https://science.nasa.gov/mission/cassini/')],
  },
  {
    id: 'm07-new-horizons',
    code: 'SAT-007',
    folderTitle: 'Pluto Mission',
    regionTag: 'KUIPER BELT',
    eraTab: '1990s-2000s',
    levelNumber: 7,
    spacecraft: 'New Horizons',
    callsignBase: 'HORIZONS',
    launchDateISO: '2006-01-19',
    launchTimeUTC: '19:00',
    launchVehicle: 'Atlas V 551',
    launchSite: 'Cape Canaveral, SLC-41',
    briefingTarget: { title: 'PLUTO', designation: 'KUIPER BELT', rangeAu: 39.48, bodyId: 'pluto' },
    launchContext:
      'New Horizons launched on an Atlas V 551 straight onto an escape path and passed the Moon\'s orbit in about nine hours. NASA describes it as the fastest spacecraft ever launched.',
    knownAtLaunch:
      'Pluto, found in 1930, had only ever been seen as a blurry dot. No spacecraft had visited it.',
    discoveryFact:
      'Fastest spacecraft ever launched from Earth, crossing the Moon\'s orbit in just 9 hours and executing the first reconnaissance flyby of Pluto and Charon on July 14, 2015.',
    objectiveHeadline: 'Documented Jupiter, Pluto and Charon',
    objectives: perTarget(['jupiter', 'pluto', 'charon']),
    targetIds: ['jupiter', 'pluto', 'charon'],
    tier: 3,
    segmentSeconds: 35,
    sources: [src('NASA Science: New Horizons', 'https://science.nasa.gov/mission/new-horizons/')],
  },
  {
    id: 'm08-juno',
    code: 'SAT-008',
    folderTitle: 'Jupiter Polar Mission',
    regionTag: 'JUPITER SYSTEM',
    eraTab: '2010s-2020s',
    levelNumber: 8,
    spacecraft: 'Juno',
    callsignBase: 'JUNO',
    launchDateISO: '2011-08-05',
    launchTimeUTC: '16:25',
    launchVehicle: 'Atlas V 551',
    launchSite: 'Cape Canaveral, SLC-41',
    briefingTarget: { title: 'JUPITER', designation: 'SOL V', rangeAu: 5.2, bodyId: 'jupiter' },
    launchContext:
      'Juno was the first solar-powered spacecraft to operate at Jupiter\'s distance from the Sun. It entered orbit on July 4, 2016 (US time) on a path that carries it over the planet\'s poles.',
    knownAtLaunch:
      'Spacecraft had flown past and orbited Jupiter, but its deep interior and magnetic field were still poorly understood.',
    discoveryFact:
      'First solar-powered spacecraft to operate at Jupiter\'s distance from the Sun; entered polar orbit on July 4, 2016 to peer beneath Jupiter\'s dense cloud tops and map its magnetosphere.',
    objectiveHeadline: 'Documented Jupiter and its great moons',
    objectives: perTarget(['jupiter', 'ganymede', 'europa', 'io']),
    targetIds: ['jupiter', 'ganymede', 'europa', 'io'],
    tier: 3,
    segmentSeconds: 38,
    sources: [
      src('NASA Science: Juno', 'https://science.nasa.gov/mission/juno/'),
      src('NASA JPL: Juno press kit', 'https://www.jpl.nasa.gov/news/press_kits/juno/facts/'),
    ],
  },
  {
    id: 'm09-webb',
    code: 'SAT-009',
    folderTitle: 'Deep Field Mission',
    regionTag: 'DEEP SPACE',
    eraTab: '2010s-2020s',
    levelNumber: 9,
    spacecraft: 'James Webb Space Telescope',
    callsignBase: 'WEBB',
    launchDateISO: '2021-12-25',
    launchTimeUTC: '12:20',
    launchVehicle: 'Ariane 5 ECA',
    launchSite: 'Kourou, French Guiana (ELA-3)',
    briefingTarget: { title: 'SUN–EARTH L2', designation: 'DEEP FIELD', rangeAu: 1.01, bodyId: 'webb' },
    launchContext:
      'Webb launched on Christmas Day 2021 from Kourou on an Ariane 5. It carries an 18-segment, gold-coated beryllium mirror 6.5 meters wide toward a point about 1.5 million kilometers from Earth.',
    knownAtLaunch:
      'Hubble had studied the universe mostly in visible light. Astronomers wanted a larger infrared telescope to see the first galaxies and the atmospheres of other worlds.',
    discoveryFact:
      'Launched on Christmas Day to Sun–Earth Lagrange Point 2 (1.5 million km away) with an 18-segment gold-plated beryllium mirror to capture infrared light from the earliest galaxies and exoplanet atmospheres.',
    objectiveHeadline: 'Documented the deep field',
    objectives: perTarget(['webb', 'carina', 'stephan', 'wasp-39b']),
    targetIds: ['webb', 'carina', 'stephan', 'wasp-39b'],
    tier: 4,
    segmentSeconds: 40,
    sources: [src('NASA Science: Webb', 'https://science.nasa.gov/mission/webb/')],
  },
];

// --- Lookups ---------------------------------------------------------------------

export const MISSION_COUNT = MISSIONS.length;
export const FINAL_MISSION_LEVEL = MISSION_COUNT;

export function getMission(id: string | null | undefined): MissionData | undefined {
  return id ? MISSIONS.find((m) => m.id === id) : undefined;
}

export function getMissionByLevel(level: number): MissionData | undefined {
  return MISSIONS.find((m) => m.levelNumber === level);
}

export function getMissionsByEra(era: EraTab): MissionData[] {
  return MISSIONS.filter((m) => m.eraTab === era);
}

export function getTierConfig(mission: MissionData): TierConfig {
  return TIER_CONFIG[mission.tier];
}

/** Sequential unlock: Mission 1 is always open; others need the previous mission completed. */
export function isMissionUnlocked(
  mission: MissionData,
  progress: Readonly<Record<string, { completed: boolean } | undefined>>,
): boolean {
  if (mission.levelNumber === 1) return true;
  const previous = getMissionByLevel(mission.levelNumber - 1);
  return previous ? progress[previous.id]?.completed === true : false;
}

export function isCampaignComplete(
  progress: Readonly<Record<string, { completed: boolean } | undefined>>,
): boolean {
  return MISSIONS.every((m) => progress[m.id]?.completed === true);
}

// --- Formatting ------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '1997-10-15' -> 'Oct 15, 1997'. Parsed by hand so time zones can never shift the date. */
export function formatLaunchDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Launch stamp for folder cards: 'Launched: Oct 15, 1997'. */
export function formatLaunchStamp(mission: MissionData): string {
  return `Launched: ${formatLaunchDate(mission.launchDateISO)}`;
}

export function defaultCallsign(mission: MissionData): string {
  return `${mission.callsignBase}-II`;
}

/** Paragraphs for the typed-out "Incoming Transmission / Flight Director" window. */
export function buildTransmission(mission: MissionData): string[] {
  return [
    `Launch: ${formatLaunchDate(mission.launchDateISO)}, ${mission.launchTimeUTC} UTC. ${mission.spacecraft} lifted off on ${mission.launchVehicle} from ${mission.launchSite}.`,
    mission.launchContext,
    `What we knew then: ${mission.knownAtLaunch}`,
    `Your mission: pilot a research satellite through the sector and scan ${mission.targetIds.length} ${mission.targetIds.length === 1 ? 'world' : 'worlds'}. Weave around the asteroids, and type each name to scan it.`,
  ];
}

// --- Dev-time validation -----------------------------------------------------------

/** Returns a list of problems in the mission data (empty when healthy). */
export function validateMissions(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  let previousDate = '';

  MISSIONS.forEach((m, index) => {
    if (ids.has(m.id)) problems.push(`duplicate mission id: ${m.id}`);
    ids.add(m.id);
    if (m.levelNumber !== index + 1) problems.push(`${m.id}: levelNumber ${m.levelNumber} != ${index + 1}`);
    if (m.code !== `SAT-${String(m.levelNumber).padStart(3, '0')}`) problems.push(`${m.id}: bad code ${m.code}`);
    if (m.launchDateISO < previousDate) problems.push(`${m.id}: not in launch-date order`);
    previousDate = m.launchDateISO;

    const year = Number(m.launchDateISO.slice(0, 4));
    const era = ERA_TABS.find((e) => e.id === m.eraTab);
    if (!era || year < era.firstYear || year > era.lastYear) {
      problems.push(`${m.id}: launch year ${year} does not match era ${m.eraTab}`);
    }
    if (m.segmentSeconds < 25 || m.segmentSeconds > 40) problems.push(`${m.id}: segmentSeconds out of range`);

    m.targetIds.forEach((t) => {
      if (!getBody(t)) problems.push(`${m.id}: unknown target ${t}`);
    });
    m.hiddenTargetIds?.forEach((t) => {
      if (!m.targetIds.includes(t)) problems.push(`${m.id}: hidden target ${t} is not a target`);
    });

    const covered = new Set(m.objectives.flatMap((o) => o.targetIds));
    m.targetIds.forEach((t) => {
      if (!covered.has(t)) problems.push(`${m.id}: target ${t} is not covered by an objective`);
    });
    if (!getBody(m.briefingTarget.bodyId)) problems.push(`${m.id}: unknown briefing body`);
    if (m.sources.length === 0) problems.push(`${m.id}: no sources`);
  });

  return problems;
}
