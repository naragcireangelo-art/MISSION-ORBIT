/**
 * missions.ts — The 9 chronological NASA missions of Mission Orbit (PRD §5).
 *
 * Every launch date, UTC time, vehicle and pad below comes from PRD §5, which the PRD
 * says is verified against official NASA mission archives (see `sources` on each mission).
 * Missions are ordered strictly by launch date and grouped into three era folders.
 *
 * This file has no dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type MissionId =
  | 'SAT-001'
  | 'SAT-002'
  | 'SAT-003'
  | 'SAT-004'
  | 'SAT-005'
  | 'SAT-006'
  | 'SAT-007'
  | 'SAT-008'
  | 'SAT-009';

export type EraId = 'era-1970s-1980s' | 'era-1990s-2000s' | 'era-2010s-2020s';

/** Which vector body to show as the mission's "target" on cards and in the Briefing. */
export type FeaturedBodyId =
  | 'mercury'
  | 'mars'
  | 'neptune'
  | 'jupiter'
  | 'venus'
  | 'saturn'
  | 'pluto'
  | 'webb';

export interface Era {
  id: EraId;
  /** Text on the folder tab. */
  tabLabel: string;
  /** Heading inside the open folder (PRD §5). */
  folderTitle: string;
  /** Inclusive range of launch years in this folder. */
  fromYear: number;
  toYear: number;
}

export interface MissionLaunch {
  /** ISO-8601 UTC timestamp of liftoff. */
  isoUtc: string;
  /** "NOV" */
  monthShort: string;
  /** "November" */
  monthLong: string;
  day: number;
  year: number;
  /** "05:45 UTC" */
  timeUtc: string;
  /** "November 3, 1973" */
  fullDate: string;
  vehicle: string;
  site: string;
}

export interface MissionSource {
  label: string;
  url: string;
}

export interface Mission {
  id: MissionId;
  /** 1–9, campaign order. */
  level: number;
  era: EraId;
  title: string;
  spacecraft: string;
  /** Pre-filled satellite callsign for the Assembly screen (max 16 characters). */
  callsign: string;
  /** Target-region tag shown on the dossier card. */
  region: string;
  launch: MissionLaunch;
  /** Celestial bodies to scan, in order. These are the exact names the player types. */
  targets: string[];
  /** Body drawn as the mission's hero art. */
  featuredBody: FeaturedBodyId;
  /** One-line mission teaser for the dossier card. */
  tagline: string;
  /** One-sentence level objective, shown first in the Briefing. */
  goal: string;
  /** PRD §5 "Historical Knowledge Imparted". */
  legacy: string;
  /** What humanity knew on launch day — paragraphs for the Briefing transmission. */
  launchDayBriefing: string[];
  sources: MissionSource[];
}

// ── Era folders ──────────────────────────────────────────────────────────────

export const ERAS: Era[] = [
  {
    id: 'era-1970s-1980s',
    tabLabel: '1970s – 1980s',
    folderTitle: 'Missions Launched: 1970s – 1980s',
    fromYear: 1970,
    toYear: 1989,
  },
  {
    id: 'era-1990s-2000s',
    tabLabel: '1990s – 2000s',
    folderTitle: 'Missions Launched: 1990s – 2000s',
    fromYear: 1990,
    toYear: 2009,
  },
  {
    id: 'era-2010s-2020s',
    tabLabel: '2010s – 2020s',
    folderTitle: 'Missions Launched: 2010s – 2020s',
    fromYear: 2010,
    toYear: 2029,
  },
];

// ── The nine missions ────────────────────────────────────────────────────────

export const MISSIONS: Mission[] = [
  // ── ERA 1: 1970s – 1980s ───────────────────────────────────────────────────
  {
    id: 'SAT-001',
    level: 1,
    era: 'era-1970s-1980s',
    title: 'Mercury Mission',
    spacecraft: 'Mariner 10',
    callsign: 'MARINER-10',
    region: 'Inner Solar System · Mercury',
    launch: {
      isoUtc: '1973-11-03T05:45:00Z',
      monthShort: 'NOV',
      monthLong: 'November',
      day: 3,
      year: 1973,
      timeUtc: '05:45 UTC',
      fullDate: 'November 3, 1973',
      vehicle: 'Atlas-Centaur',
      site: 'Cape Canaveral LC-36B',
    },
    targets: ['Venus', 'Mercury'],
    featuredBody: 'mercury',
    tagline: 'Borrow Venus’s gravity to reach the Sun’s closest planet.',
    goal: "Fly past Venus, then use its gravity to become the first spacecraft to reach Mercury.",
    legacy:
      'First spacecraft to use an interplanetary gravity assist (via Venus) to reach Mercury, completing three flybys in 1974–1975 to map its cratered terrain.',
    launchDayBriefing: [
      'No spacecraft has ever visited Mercury. It is a stubborn target for telescopes: it never strays far from the Sun in our sky, so even the best instruments show only a small, blurry disc. Radar echoes in 1965 revealed that Mercury turns once every 59 days — not the 88 days astronomers had believed for decades.',
      'Venus is better known, but still veiled. Mariner 2 flew past it in 1962, and Soviet landers have survived its crushing surface for brief spells, yet its clouds hide the ground from every camera.',
      'Mariner 10 will try something new: use one planet’s gravity to reach another. Venus will bend the craft’s path toward Mercury, and the orbit is timed so the spacecraft can return for repeat visits.',
    ],
    sources: [
      { label: 'NASA Science — Mariner 10', url: 'https://science.nasa.gov/mission/mariner-10/' },
      {
        label: 'NASA History — Mariner 10',
        url: 'https://www.nasa.gov/history/45-years-ago-mariner-10-off-to-venus-and-mercury/',
      },
    ],
  },
  {
    id: 'SAT-002',
    level: 2,
    era: 'era-1970s-1980s',
    title: 'Mars Mission',
    spacecraft: 'Viking 1',
    callsign: 'VIKING-1',
    region: 'Inner Solar System · Mars',
    launch: {
      isoUtc: '1975-08-20T21:22:00Z',
      monthShort: 'AUG',
      monthLong: 'August',
      day: 20,
      year: 1975,
      timeUtc: '21:22 UTC',
      fullDate: 'August 20, 1975',
      vehicle: 'Titan IIIE-Centaur',
      site: 'Cape Canaveral LC-41',
    },
    targets: ['Mars', 'Phobos', 'Deimos'],
    featuredBody: 'mars',
    tagline: 'Put the first working lander on the Red Planet.',
    goal: "Reach Mars and document the Red Planet and its two small moons, Phobos and Deimos.",
    legacy:
      'Launched on an 11-month voyage to Mars; its lander touched down on Chryse Planitia on July 20, 1976, transmitting the first photograph taken from the Martian surface.',
    launchDayBriefing: [
      'Mars has been watched for centuries, but spacecraft have only just begun to read it. Mariner 4 sent the first close-up pictures in 1965, and Mariner 9 — the first spacecraft to orbit another planet — mapped the globe in 1971–72, revealing giant volcanoes, canyons thousands of kilometers long and channels that look carved by ancient water.',
      'Nobody has yet received a clear photograph from the surface. The Soviet Mars 3 lander reached the ground in 1971 and fell silent after mere seconds.',
      'Each Viking mission pairs an orbiter, to survey from above, with a lander, to stand on the soil and run experiments designed to look for signs of life. Mars’s two small moons, Phobos and Deimos, were found by Asaph Hall in 1877 — and the Viking orbiters will see them up close.',
    ],
    sources: [{ label: 'NASA Science — Viking 1', url: 'https://science.nasa.gov/mission/viking-1/' }],
  },
  {
    id: 'SAT-003',
    level: 3,
    era: 'era-1970s-1980s',
    title: 'Ice Giants Mission',
    spacecraft: 'Voyager 2',
    callsign: 'VOYAGER-2',
    region: 'Outer Solar System · Ice Giants',
    launch: {
      isoUtc: '1977-08-20T14:29:00Z',
      monthShort: 'AUG',
      monthLong: 'August',
      day: 20,
      year: 1977,
      timeUtc: '14:29 UTC',
      fullDate: 'August 20, 1977',
      vehicle: 'Titan IIIE-Centaur',
      site: 'Cape Canaveral LC-41',
    },
    targets: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Triton'],
    featuredBody: 'neptune',
    tagline: 'The Grand Tour: four giant planets on one trajectory.',
    goal: "Fly the Grand Tour: document all four giant planets, then Neptune’s moon Triton.",
    legacy:
      'Launched 16 days before Voyager 1 on a trajectory taking advantage of a rare 175-year planetary alignment; remains the only spacecraft to visit Uranus (1986) and Neptune (1989).',
    launchDayBriefing: [
      'Only Pioneer 10 and Pioneer 11 have reached Jupiter, and Saturn has never had a visitor. Uranus, found by William Herschel in 1781, and Neptune, found in 1846, are faint blue-green dots. Rings around Uranus were detected from Earth only this past March, by watching a star blink out behind the planet.',
      'Voyager 2 launches on a path that exploits a planetary alignment that comes around only about once every 175 years, letting gravity assists carry a single spacecraft past four giant planets.',
      'Triton, Neptune’s large moon, was discovered by William Lassell just 17 days after Neptune itself. Its true size and nature are unknown — and so is almost everything about the worlds along this route.',
    ],
    sources: [
      { label: 'NASA Science — Voyager 2', url: 'https://science.nasa.gov/mission/voyager/voyager-2/' },
      {
        label: 'NASA Planetary Voyage',
        url: 'https://science.nasa.gov/mission/voyager/planetary-voyage/',
      },
    ],
  },
  {
    id: 'SAT-004',
    level: 4,
    era: 'era-1970s-1980s',
    title: 'Gas Giants Mission',
    spacecraft: 'Voyager 1',
    callsign: 'VOYAGER-1',
    region: 'Outer Solar System · Gas Giants',
    launch: {
      isoUtc: '1977-09-05T12:56:00Z',
      monthShort: 'SEP',
      monthLong: 'September',
      day: 5,
      year: 1977,
      timeUtc: '12:56 UTC',
      fullDate: 'September 5, 1977',
      vehicle: 'Titan IIIE-Centaur',
      site: 'Cape Canaveral LC-41',
    },
    targets: ['Jupiter', 'Io', 'Saturn', 'Titan'],
    featuredBody: 'jupiter',
    tagline: 'Race the twin: the faster road to Jupiter and Saturn.',
    goal: "Speed past Jupiter and its volcanic moon Io, then on to Saturn and giant Titan.",
    legacy:
      'Launched on a faster path than its twin, reaching Jupiter in March 1979 (discovering active sulfur volcanoes on Io) and Saturn in November 1980 before heading toward interstellar space.',
    launchDayBriefing: [
      'Jupiter’s four large moons were first seen by Galileo Galilei in 1610, yet they remain blurry specks. Pioneer 10 and Pioneer 11 have flown past Jupiter, sending back its first close-up cloud images and measuring its fierce radiation belts.',
      'Saturn has had no visitor — Pioneer 11 is still on its way. Titan, Saturn’s largest moon, is known to wear an atmosphere (Gerard Kuiper detected methane there in 1944), but nobody knows what lies beneath its haze.',
      'Voyager 1 launches second but on a faster, shorter trajectory. It will overtake its twin and reach Jupiter first.',
    ],
    sources: [
      { label: 'NASA Science — Voyager 1', url: 'https://science.nasa.gov/mission/voyager/voyager-1/' },
      { label: 'NASA NSSDCA Voyager Archive', url: 'https://nssdc.gsfc.nasa.gov/planetary/voyager.html' },
    ],
  },
  {
    id: 'SAT-005',
    level: 5,
    era: 'era-1970s-1980s',
    title: 'Venus Mission',
    spacecraft: 'Magellan',
    callsign: 'MAGELLAN',
    region: 'Inner Solar System · Venus',
    launch: {
      isoUtc: '1989-05-04T18:47:00Z',
      monthShort: 'MAY',
      monthLong: 'May',
      day: 4,
      year: 1989,
      timeUtc: '18:47 UTC',
      fullDate: 'May 4, 1989',
      vehicle: 'Space Shuttle Atlantis (STS-30) / IUS',
      site: 'Kennedy Space Center LC-39B',
    },
    targets: ['Earth', 'Venus'],
    featuredBody: 'venus',
    tagline: 'Pierce the clouds with radar and map a whole planet.',
    goal: "Document Earth, then Venus: the cloud-wrapped planet Magellan mapped with radar.",
    legacy:
      'First planetary spacecraft launched from a Space Shuttle; entered Venus orbit on Aug 10, 1990 and used synthetic aperture radar to map 98% of the planet’s cloud-shrouded surface.',
    launchDayBriefing: [
      'Venus is almost Earth’s twin in size, yet a permanent blanket of cloud hides its surface from every camera. Soviet landers have photographed small patches of rubble-strewn plain, but the heat destroys them within about two hours.',
      'Radar can see through the clouds, and earlier orbiters have mapped parts of the surface. Magellan will use synthetic aperture radar to map nearly all of it in far sharper detail.',
      'Magellan will be the first planetary spacecraft launched from a Space Shuttle, riding in the payload bay of Atlantis on mission STS-30. Its launch was delayed for years after the Challenger accident in 1986.',
    ],
    sources: [
      { label: 'NASA Science — Magellan', url: 'https://science.nasa.gov/mission/magellan/' },
      { label: 'NASA STS-30 Archive', url: 'https://www.nasa.gov/mission/sts-30/' },
    ],
  },

  // ── ERA 2: 1990s – 2000s ───────────────────────────────────────────────────
  {
    id: 'SAT-006',
    level: 6,
    era: 'era-1990s-2000s',
    title: 'Saturn Mission',
    spacecraft: 'Cassini-Huygens',
    callsign: 'CASSINI',
    region: 'Saturn System',
    launch: {
      isoUtc: '1997-10-15T08:43:00Z',
      monthShort: 'OCT',
      monthLong: 'October',
      day: 15,
      year: 1997,
      timeUtc: '08:43 UTC',
      fullDate: 'October 15, 1997',
      vehicle: 'Titan IVB/Centaur',
      site: 'Cape Canaveral SLC-40',
    },
    targets: ['Titan', 'Enceladus', 'Rhea', 'Mimas', 'Iapetus', 'Dione', 'Tethys'],
    featuredBody: 'saturn',
    tagline: 'Stay at Saturn: seven moons, one very long visit.',
    goal: "Stay at Saturn and document seven moons, from hazy Titan to icy Enceladus.",
    legacy:
      'Joint NASA/ESA/ASI mission that orbited Saturn for 13 years, landing the Huygens probe on Titan (Jan 2005) and discovering icy water plumes erupting from Enceladus.',
    launchDayBriefing: [
      'Saturn has been visited three times, always in a hurry: Pioneer 11 in 1979, Voyager 1 in 1980 and Voyager 2 in 1981. No spacecraft has ever orbited it.',
      'Titan remains the great puzzle. Its atmosphere is thicker than Earth’s, and the orange haze has never let a camera see the surface. Voyager also showed Enceladus to be among the most reflective worlds in the Solar System, with surprisingly smooth, young-looking plains.',
      'Cassini–Huygens is a joint mission of NASA, the European Space Agency and the Italian Space Agency. After a voyage of nearly seven years, with gravity assists at Venus, Earth and Jupiter, it will enter orbit and release the Huygens probe toward Titan.',
    ],
    sources: [{ label: 'NASA Science — Cassini', url: 'https://science.nasa.gov/mission/cassini/' }],
  },
  {
    id: 'SAT-007',
    level: 7,
    era: 'era-1990s-2000s',
    title: 'Pluto Mission',
    spacecraft: 'New Horizons',
    callsign: 'NEW-HORIZONS',
    region: 'Kuiper Belt · Pluto',
    launch: {
      isoUtc: '2006-01-19T19:00:00Z',
      monthShort: 'JAN',
      monthLong: 'January',
      day: 19,
      year: 2006,
      timeUtc: '19:00 UTC',
      fullDate: 'January 19, 2006',
      vehicle: 'Atlas V 551',
      site: 'Cape Canaveral SLC-41',
    },
    targets: ['Jupiter', 'Pluto', 'Charon'],
    featuredBody: 'pluto',
    tagline: 'The fastest launch ever, bound for a world no one has seen.',
    goal: "Cross the solar system: use Jupiter’s gravity, then document Pluto and its moon Charon.",
    legacy:
      'Fastest spacecraft ever launched from Earth, crossing the Moon’s orbit in just 9 hours and executing the first reconnaissance flyby of Pluto and Charon on July 14, 2015. Seven months after launch, on August 24, 2006, astronomers reclassified Pluto as a dwarf planet.',
    launchDayBriefing: [
      'Pluto, discovered by Clyde Tombaugh in 1930, is the one planet no spacecraft has visited. Even the Hubble Space Telescope sees it as only a few fuzzy pixels, and its large moon Charon, found by James Christy in 1978, is just as mysterious. Hubble added two more tiny moons, Nix and Hydra, only last year.',
      'New Horizons will be the fastest spacecraft ever launched from Earth, crossing the Moon’s orbit in about nine hours. It will use Jupiter’s gravity for a boost in early 2007 to shorten the road to the edge of the Solar System.',
      'The journey will take nearly a decade. When it arrives, Pluto and Charon will be seen up close for the first time.',
    ],
    sources: [{ label: 'NASA Science — New Horizons', url: 'https://science.nasa.gov/mission/new-horizons/' }],
  },

  // ── ERA 3: 2010s – 2020s ───────────────────────────────────────────────────
  {
    id: 'SAT-008',
    level: 8,
    era: 'era-2010s-2020s',
    title: 'Jupiter Polar Mission',
    spacecraft: 'Juno',
    callsign: 'JUNO',
    region: 'Jupiter System · Polar Orbit',
    launch: {
      isoUtc: '2011-08-05T16:25:00Z',
      monthShort: 'AUG',
      monthLong: 'August',
      day: 5,
      year: 2011,
      timeUtc: '16:25 UTC',
      fullDate: 'August 5, 2011',
      vehicle: 'Atlas V 551',
      site: 'Cape Canaveral SLC-41',
    },
    targets: ['Jupiter', 'Ganymede', 'Europa', 'Io'],
    featuredBody: 'jupiter',
    tagline: 'Solar-powered, pole-to-pole, and built to look beneath the clouds.',
    goal: "Orbit Jupiter and document the planet plus three of its moons: Ganymede, Europa and Io.",
    legacy:
      'First solar-powered spacecraft to operate at Jupiter’s distance from the Sun; entered polar orbit on July 4, 2016 to peer beneath Jupiter’s dense cloud tops and map its magnetosphere.',
    launchDayBriefing: [
      'Jupiter has had visitors: Galileo orbited it from 1995 to 2003 and dropped a probe into its atmosphere. But no one knows what lies inside — whether Jupiter hides a solid core, how much water it holds, or where its enormous magnetic field is born.',
      'Earlier Jupiter missions relied on nuclear power sources. Juno will rely on three giant solar arrays, flying in a polar orbit that swoops between the planet and its punishing radiation belts.',
      'Jupiter’s moons are already strange worlds: Ganymede is the largest moon in the Solar System, Europa is thought to hide an ocean beneath its ice, and Io is the most volcanically active body known.',
    ],
    sources: [
      { label: 'NASA Science — Juno', url: 'https://science.nasa.gov/mission/juno/' },
      { label: 'NASA JPL Juno Press Kit', url: 'https://www.jpl.nasa.gov/news/press_kits/juno/facts/' },
    ],
  },
  {
    id: 'SAT-009',
    level: 9,
    era: 'era-2010s-2020s',
    title: 'Deep Field Mission',
    spacecraft: 'James Webb Space Telescope',
    callsign: 'WEBB',
    region: 'Deep Field · Sun–Earth L2',
    launch: {
      isoUtc: '2021-12-25T12:20:00Z',
      monthShort: 'DEC',
      monthLong: 'December',
      day: 25,
      year: 2021,
      timeUtc: '12:20 UTC',
      fullDate: 'December 25, 2021',
      vehicle: 'Ariane 5 ECA',
      site: 'Kourou ELA-3',
    },
    targets: ['Webb', 'Carina', 'Stephan', 'WASP-39b'],
    featuredBody: 'webb',
    tagline: 'Unfold a golden mirror 1.5 million km away and see the first light.',
    goal: "Document the Webb telescope, the Carina Nebula, Stephan’s Quintet and the exoplanet WASP-39b.",
    legacy:
      'Launched on Christmas Day to Sun–Earth Lagrange Point 2 (1.5 million km away) with an 18-segment gold-plated beryllium mirror to capture infrared light from the earliest galaxies and exoplanet atmospheres.',
    launchDayBriefing: [
      'The Hubble Space Telescope, launched in 1990, has shown us galaxies as they were when the Universe was young — but it sees mostly visible light. Webb will look in infrared, which slips through cosmic dust and captures the stretched light of the earliest galaxies.',
      'Webb is a bet two decades in the making: a 6.5-meter mirror of 18 gold-coated beryllium segments, too large for any rocket, so it must fold up for launch and unfold itself in space. At 1.5 million kilometers away, no repair mission can reach it.',
      'Astronomers have found thousands of planets around other stars, but have barely begun to read their atmospheres. Webb is built to analyze their light for the chemical fingerprints of the gases inside.',
    ],
    sources: [{ label: 'NASA Science — Webb', url: 'https://science.nasa.gov/mission/webb/' }],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const BY_ID = new Map<string, Mission>(MISSIONS.map((m) => [m.id, m]));

export function getMission(id: string | null | undefined): Mission | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function getMissionsByEra(era: EraId): Mission[] {
  return MISSIONS.filter((m) => m.era === era);
}

/** Every level is open from the start. */
export function isMissionUnlocked(_mission: Mission, _completedIds: readonly string[]): boolean {
  return true;
}

/** Kept for the card component; nothing is locked, so there is never a requirement. */
export function getUnlockRequirement(_mission: Mission): Mission | undefined {
  return undefined;
}
