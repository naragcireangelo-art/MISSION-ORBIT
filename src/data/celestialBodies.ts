/**
 * celestialBodies.ts — every scannable world in the campaign, defined once.
 *
 * Missions reference bodies by id (see missions.ts). Numbers are approximate
 * mean values from NASA planetary and satellite fact sheets and are shown to
 * the player as approximate (as in the reference build's Science Log card).
 *
 * CONTENT STATUS: diameters, orbital radii, facts and source URLs were written
 * for the PRD's NASA-only rule but still need the second-reviewer check in
 * PRD 8.4 before content lock. `sourceUrl` values point at NASA Science pages
 * and must be confirmed to resolve.
 */

export type BodyKind =
  | 'planet'
  | 'dwarf-planet'
  | 'moon'
  | 'exoplanet'
  | 'observatory'
  | 'nebula'
  | 'galaxy-group';

export interface BodyPalette {
  base: string;
  shade: string;
  accent: string;
}

export interface CelestialBody {
  id: string;
  /** Label shown in the HUD and on the scan reticle. */
  name: string;
  /** Longer title for the Science Log card, when different from `name`. */
  fullName?: string;
  /** What the player types. Lowercase ASCII: a-z, 0-9, space, hyphen. */
  scanName: string;
  kind: BodyKind;
  /** Body this one orbits (moons -> planet, Charon -> Pluto, Webb -> Earth). */
  parentId?: string;
  diameterKm?: number;
  /** Orbital radius around the parent, in km. */
  orbitalRadiusKm?: number;
  /** Mean distance from the Sun, in AU (planets and dwarf planets). */
  distanceAu?: number;
  /** Distance from Earth, in light-years (deep-sky targets). */
  distanceLy?: number;
  /** Vector rendering hints. */
  palette: BodyPalette;
  /** Visual size relative to the play-area height (1 = fills the screen height). */
  visualRadius: number;
  rings?: boolean;
  /** One-sentence Science Log fact. */
  fact: string;
  sourceUrl: string;
}

const NASA = 'https://science.nasa.gov';

export const BODY_LIST = [
  // --- Planets -------------------------------------------------------------
  {
    id: 'mercury', name: 'Mercury', scanName: 'mercury', kind: 'planet',
    diameterKm: 4879, distanceAu: 0.387,
    palette: { base: '#a7a39b', shade: '#6f6b64', accent: '#cfcac0' }, visualRadius: 0.38,
    fact: 'Mercury is the smallest planet and the closest to the Sun, with a surface covered in craters.',
    sourceUrl: `${NASA}/mercury/`,
  },
  {
    id: 'venus', name: 'Venus', scanName: 'venus', kind: 'planet',
    diameterKm: 12104, distanceAu: 0.723,
    palette: { base: '#e3c27a', shade: '#a67f3b', accent: '#f5e2ae' }, visualRadius: 0.6,
    fact: 'Venus is the hottest planet, hidden under thick clouds of sulfuric acid.',
    sourceUrl: `${NASA}/venus/`,
  },
  {
    id: 'earth', name: 'Earth', scanName: 'earth', kind: 'planet',
    diameterKm: 12742, distanceAu: 1.0,
    palette: { base: '#3d7fd6', shade: '#1d3f7a', accent: '#7fd18b' }, visualRadius: 0.62,
    fact: 'Earth is the only world known to host life and the departure point for every mission in the archive.',
    sourceUrl: `${NASA}/earth/`,
  },
  {
    id: 'mars', name: 'Mars', scanName: 'mars', kind: 'planet',
    diameterKm: 6779, distanceAu: 1.524,
    palette: { base: '#c1633a', shade: '#7c3a1f', accent: '#e8a27c' }, visualRadius: 0.45,
    fact: 'Mars is a cold desert world with Olympus Mons, the largest volcano in the solar system.',
    sourceUrl: `${NASA}/mars/`,
  },
  {
    id: 'jupiter', name: 'Jupiter', scanName: 'jupiter', kind: 'planet',
    diameterKm: 139820, distanceAu: 5.204,
    palette: { base: '#d8a574', shade: '#8f5f3a', accent: '#f1d9bd' }, visualRadius: 1.1,
    fact: 'Jupiter is the largest planet, and its Great Red Spot is a storm larger than Earth.',
    sourceUrl: `${NASA}/jupiter/`,
  },
  {
    id: 'saturn', name: 'Saturn', scanName: 'saturn', kind: 'planet',
    diameterKm: 116460, distanceAu: 9.537, rings: true,
    palette: { base: '#d9c38d', shade: '#92804f', accent: '#efe2bb' }, visualRadius: 1.0,
    fact: 'Saturn\'s rings are made mostly of water-ice particles ranging from dust grains to boulders.',
    sourceUrl: `${NASA}/saturn/`,
  },
  {
    id: 'uranus', name: 'Uranus', scanName: 'uranus', kind: 'planet',
    diameterKm: 50724, distanceAu: 19.19, rings: true,
    palette: { base: '#9fe0e6', shade: '#4f9aa3', accent: '#d2f4f7' }, visualRadius: 0.8,
    fact: 'Uranus rotates on its side, tilted about 98 degrees from the plane of its orbit.',
    sourceUrl: `${NASA}/uranus/`,
  },
  {
    id: 'neptune', name: 'Neptune', scanName: 'neptune', kind: 'planet',
    diameterKm: 49244, distanceAu: 30.07,
    palette: { base: '#3f66d8', shade: '#1f3790', accent: '#8fa8f2' }, visualRadius: 0.8,
    fact: 'Neptune is the windiest planet in the solar system, with supersonic winds.',
    sourceUrl: `${NASA}/neptune/`,
  },
  {
    id: 'pluto', name: 'Pluto', scanName: 'pluto', kind: 'dwarf-planet',
    diameterKm: 2377, distanceAu: 39.48,
    palette: { base: '#d1b8a0', shade: '#7f6a58', accent: '#f1e4d6' }, visualRadius: 0.42,
    fact: 'Pluto has a heart-shaped plain of nitrogen ice called Sputnik Planitia.',
    sourceUrl: `${NASA}/dwarf-planets/pluto/`,
  },

  // --- Moons: Mars ---------------------------------------------------------
  {
    id: 'phobos', name: 'Phobos', scanName: 'phobos', kind: 'moon', parentId: 'mars',
    diameterKm: 22.2, orbitalRadiusKm: 9376,
    palette: { base: '#8d8579', shade: '#554f46', accent: '#b9b0a3' }, visualRadius: 0.2,
    fact: 'Phobos is the larger of Mars\'s two moons and orbits closer to its planet than any other known moon.',
    sourceUrl: `${NASA}/mars/moons/phobos/`,
  },
  {
    id: 'deimos', name: 'Deimos', scanName: 'deimos', kind: 'moon', parentId: 'mars',
    diameterKm: 12.4, orbitalRadiusKm: 23460,
    palette: { base: '#a39a8c', shade: '#625b50', accent: '#cfc6b6' }, visualRadius: 0.16,
    fact: 'Deimos is the smaller of Mars\'s two moons and takes about 30 hours to orbit.',
    sourceUrl: `${NASA}/mars/moons/deimos/`,
  },

  // --- Moons: Jupiter ------------------------------------------------------
  {
    id: 'io', name: 'Io', scanName: 'io', kind: 'moon', parentId: 'jupiter',
    diameterKm: 3643, orbitalRadiusKm: 421800,
    palette: { base: '#e8d35a', shade: '#a8892a', accent: '#f6efb0' }, visualRadius: 0.4,
    fact: 'Io is the most volcanically active world in the solar system.',
    sourceUrl: `${NASA}/jupiter/moons/io/`,
  },
  {
    id: 'europa', name: 'Europa', scanName: 'europa', kind: 'moon', parentId: 'jupiter',
    diameterKm: 3122, orbitalRadiusKm: 671100,
    palette: { base: '#d9d2c4', shade: '#8f7a5e', accent: '#f1ece2' }, visualRadius: 0.38,
    fact: 'Europa hides a global ocean of salty water beneath its icy shell.',
    sourceUrl: `${NASA}/jupiter/moons/europa/`,
  },
  {
    id: 'ganymede', name: 'Ganymede', scanName: 'ganymede', kind: 'moon', parentId: 'jupiter',
    diameterKm: 5268, orbitalRadiusKm: 1070400,
    palette: { base: '#a89a8a', shade: '#5f5446', accent: '#d2c6b6' }, visualRadius: 0.5,
    fact: 'Ganymede is the largest moon in the solar system, bigger than the planet Mercury.',
    sourceUrl: `${NASA}/jupiter/moons/ganymede/`,
  },

  // --- Moons: Saturn -------------------------------------------------------
  {
    id: 'titan', name: 'Titan', scanName: 'titan', kind: 'moon', parentId: 'saturn',
    diameterKm: 5150, orbitalRadiusKm: 1221870,
    palette: { base: '#d89a3c', shade: '#8a5b1c', accent: '#f0c576' }, visualRadius: 0.55,
    fact: 'Titan is the only moon with a dense atmosphere, and it has lakes of liquid methane and ethane.',
    sourceUrl: `${NASA}/saturn/moons/titan/`,
  },
  {
    id: 'enceladus', name: 'Enceladus', scanName: 'enceladus', kind: 'moon', parentId: 'saturn',
    diameterKm: 504, orbitalRadiusKm: 238020,
    palette: { base: '#e8f2f7', shade: '#8fb0c2', accent: '#ffffff' }, visualRadius: 0.4,
    fact: 'Enceladus sprays plumes of water ice from its south pole, a sign of a hidden ocean.',
    sourceUrl: `${NASA}/saturn/moons/enceladus/`,
  },
  {
    id: 'rhea', name: 'Rhea', scanName: 'rhea', kind: 'moon', parentId: 'saturn',
    diameterKm: 1528, orbitalRadiusKm: 527100,
    palette: { base: '#bdb7ab', shade: '#6d685e', accent: '#e2ddd2' }, visualRadius: 0.42,
    fact: 'Rhea is Saturn\'s second-largest moon, a heavily cratered ball of mostly water ice.',
    sourceUrl: `${NASA}/saturn/moons/rhea/`,
  },
  {
    id: 'mimas', name: 'Mimas', scanName: 'mimas', kind: 'moon', parentId: 'saturn',
    diameterKm: 396, orbitalRadiusKm: 185540,
    palette: { base: '#aaa69c', shade: '#625f57', accent: '#d3cfc4' }, visualRadius: 0.36,
    fact: 'The Herschel impact crater gives Mimas its distinctive appearance.',
    sourceUrl: `${NASA}/saturn/moons/mimas/`,
  },
  {
    id: 'iapetus', name: 'Iapetus', scanName: 'iapetus', kind: 'moon', parentId: 'saturn',
    diameterKm: 1469, orbitalRadiusKm: 3560800,
    palette: { base: '#6a5c4c', shade: '#2e2822', accent: '#e8e2d6' }, visualRadius: 0.4,
    fact: 'Iapetus has one dark hemisphere and one bright hemisphere, giving it a two-toned look.',
    sourceUrl: `${NASA}/saturn/moons/iapetus/`,
  },
  {
    id: 'dione', name: 'Dione', scanName: 'dione', kind: 'moon', parentId: 'saturn',
    diameterKm: 1123, orbitalRadiusKm: 377400,
    palette: { base: '#c9c5bb', shade: '#767268', accent: '#eceae2' }, visualRadius: 0.38,
    fact: 'Dione is an icy moon marked by craters and bright, wispy fractures.',
    sourceUrl: `${NASA}/saturn/moons/dione/`,
  },
  {
    id: 'tethys', name: 'Tethys', scanName: 'tethys', kind: 'moon', parentId: 'saturn',
    diameterKm: 1062, orbitalRadiusKm: 294670,
    palette: { base: '#d6d3cc', shade: '#7e7b73', accent: '#f4f2ec' }, visualRadius: 0.38,
    fact: 'Tethys is an icy moon with a huge canyon, Ithaca Chasma, and the giant Odysseus crater.',
    sourceUrl: `${NASA}/saturn/moons/tethys/`,
  },

  // --- Moons: Neptune and Pluto -------------------------------------------
  {
    id: 'triton', name: 'Triton', scanName: 'triton', kind: 'moon', parentId: 'neptune',
    diameterKm: 2707, orbitalRadiusKm: 354760,
    palette: { base: '#d8c9c0', shade: '#8a7a72', accent: '#f3e9e3' }, visualRadius: 0.4,
    fact: 'Triton orbits Neptune backward, and Voyager 2 saw geyser-like eruptions on its surface.',
    sourceUrl: `${NASA}/neptune/moons/triton/`,
  },
  {
    id: 'charon', name: 'Charon', scanName: 'charon', kind: 'moon', parentId: 'pluto',
    diameterKm: 1212, orbitalRadiusKm: 19591,
    palette: { base: '#9b9b9e', shade: '#58585c', accent: '#c9a58f' }, visualRadius: 0.36,
    fact: 'Charon is so large compared with Pluto that the two orbit a point in the space between them.',
    sourceUrl: `${NASA}/dwarf-planets/pluto/moons/charon/`,
  },

  // --- Deep-field targets (Mission 9) --------------------------------------
  {
    id: 'webb', name: 'Webb', fullName: 'James Webb Space Telescope', scanName: 'webb',
    kind: 'observatory', parentId: 'earth', orbitalRadiusKm: 1500000,
    palette: { base: '#e8c24a', shade: '#8a6d1a', accent: '#fff2b8' }, visualRadius: 0.5,
    fact: 'Webb sees infrared light with an 18-segment, gold-coated beryllium mirror 6.5 meters wide.',
    sourceUrl: `${NASA}/mission/webb/`,
  },
  {
    id: 'carina', name: 'Carina', fullName: 'Carina Nebula', scanName: 'carina',
    kind: 'nebula', distanceLy: 7600,
    palette: { base: '#e08a5a', shade: '#7a3a5e', accent: '#7fb5ff' }, visualRadius: 1.1,
    fact: 'The Carina Nebula is a star-forming region, and Webb imaged its towering "Cosmic Cliffs" of gas and dust.',
    sourceUrl: `${NASA}/missions/webb/nasas-webb-reveals-cosmic-cliffs-glittering-landscape-of-star-birth/`,
  },
  {
    id: 'stephan', name: 'Stephan', fullName: 'Stephan\'s Quintet', scanName: 'stephan',
    kind: 'galaxy-group', distanceLy: 290000000,
    palette: { base: '#f2c9a0', shade: '#5a4a8a', accent: '#9ec9ff' }, visualRadius: 1.0,
    fact: 'Stephan\'s Quintet is a compact group of five galaxies, four of them interacting, that Webb imaged in 2022.',
    sourceUrl: `${NASA}/missions/webb/nasas-webb-sheds-light-on-galaxy-evolution-black-holes`,
  },
  {
    id: 'wasp-39b', name: 'WASP-39b', fullName: 'WASP-39 b', scanName: 'wasp-39b',
    kind: 'exoplanet', distanceLy: 700,
    palette: { base: '#c98a6a', shade: '#6a3f2e', accent: '#f0c6a8' }, visualRadius: 0.9,
    fact: 'Webb detected carbon dioxide in the atmosphere of WASP-39 b, a hot gas giant.',
    sourceUrl: 'https://exoplanets.nasa.gov/news/1711/webb-sees-carbon-dioxide-in-exoplanets-atmosphere',
  },
] as const satisfies readonly CelestialBody[];

export type BodyId = (typeof BODY_LIST)[number]['id'];

export const BODIES: Readonly<Record<BodyId, CelestialBody>> = Object.fromEntries(
  BODY_LIST.map((b) => [b.id, b as CelestialBody]),
) as Record<BodyId, CelestialBody>;

export function getBody(id: string): CelestialBody | undefined {
  return (BODIES as Record<string, CelestialBody>)[id];
}

export function isBodyId(id: unknown): id is BodyId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(BODIES, id);
}

/** Normalizes typed or stored text for matching: lowercase ASCII, a-z 0-9 space hyphen. */
export function normalizeScanName(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '');
}

/** The characters the player must type for a body (what scanEngine matches against). */
export function getScanText(id: string): string {
  const body = getBody(id);
  return body ? body.scanName : '';
}

// --- Science Log card -------------------------------------------------------

const intl = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function formatKm(km: number): string {
  return `${intl.format(km)} km`;
}

function formatLightYears(ly: number): string {
  if (ly >= 1_000_000) return `${intl.format(ly / 1_000_000)} million light-years`;
  return `${intl.format(ly)} light-years`;
}

export interface ScanCardRow {
  label: string;
  value: string;
}

export interface ScanCard {
  bodyId: string;
  title: string;
  rows: ScanCardRow[];
  fact: string;
  footnote: string;
}

/** Content for the "SCAN COMPLETE / SCIENCE LOG" card shown after a scan. */
export function buildScanCard(id: string): ScanCard | undefined {
  const body = getBody(id);
  if (!body) return undefined;

  const rows: ScanCardRow[] = [];
  if (body.diameterKm !== undefined) rows.push({ label: 'DIAMETER', value: formatKm(body.diameterKm) });
  if (body.orbitalRadiusKm !== undefined) {
    rows.push({ label: 'ORBITAL RADIUS', value: formatKm(body.orbitalRadiusKm) });
  }
  if (body.distanceAu !== undefined) {
    rows.push({ label: 'DISTANCE FROM SUN', value: `${intl.format(body.distanceAu)} AU` });
  }
  if (body.distanceLy !== undefined) {
    rows.push({ label: 'DISTANCE FROM EARTH', value: formatLightYears(body.distanceLy) });
  }

  const parent = body.parentId ? getBody(body.parentId) : undefined;
  return {
    bodyId: body.id,
    title: (body.fullName ?? body.name).toUpperCase(),
    rows,
    fact: body.fact,
    footnote: parent
      ? `APPROXIMATE MEAN VALUES · ${parent.name.toUpperCase()} SYSTEM`
      : 'APPROXIMATE MEAN VALUES',
  };
}

/** Dev-time consistency check; returns a list of problems (empty when healthy). */
export function validateBodies(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const body of BODY_LIST as readonly CelestialBody[]) {
    if (seen.has(body.id)) problems.push(`duplicate body id: ${body.id}`);
    seen.add(body.id);
    if (body.scanName !== normalizeScanName(body.scanName)) {
      problems.push(`scanName for ${body.id} is not normalized: "${body.scanName}"`);
    }
    if (body.scanName.length === 0) problems.push(`scanName for ${body.id} is empty`);
    if (body.parentId && !getBody(body.parentId)) {
      problems.push(`${body.id} has unknown parent ${body.parentId}`);
    }
  }
  return problems;
}
