export interface Location {
  id: string
  label: string
  region: string
  description: string
  category: 'nature' | 'urban'
  timezone: string
  /** WGS-84 latitude  (decimal degrees, positive = North) */
  lat: number
  /** WGS-84 longitude (decimal degrees, positive = East) */
  lng: number
}

export const LOCATIONS: Location[] = [
  // ── Nature (11) ───────────────────────────────────────────────────────────
  {
    id: 'knepp',
    label: 'Knepp Wildland',
    region: 'England',
    description: 'Chalk stream & birdsong',
    category: 'nature',
    timezone: 'Europe/London',
    lat: 51.04, lng: -0.47,
  },
  {
    id: 'kisumu',
    label: 'Langenholte',
    region: 'Netherlands',
    description: 'IJssel wetland & reeds',
    category: 'nature',
    timezone: 'Europe/Amsterdam',
    lat: 52.51, lng: 6.08,
  },
  {
    id: 'ortler',
    label: 'Ortler Glacier',
    region: 'Alps',
    description: 'Wind, ice & silence',
    category: 'nature',
    timezone: 'Europe/Rome',
    lat: 46.51, lng: 10.54,
  },
  {
    id: 'scotland',
    label: 'Gair Wood',
    region: 'Scotland',
    description: 'Ancient forest floor',
    category: 'nature',
    timezone: 'Europe/London',
    lat: 57.33, lng: -5.65,
  },
  {
    id: 'marseille',
    label: 'Île de Frioul',
    region: 'Mediterranean',
    description: 'Sea & coastal wind',
    category: 'nature',
    timezone: 'Europe/Paris',
    lat: 43.28, lng: 5.30,
  },
  {
    // Stream: jeju_georo.mp3 — Jeju Island, South Korea
    id: 'kyoto',
    label: 'Jeju Island',
    region: 'South Korea',
    description: 'Forest edge & ocean wind',
    category: 'nature',
    timezone: 'Asia/Seoul',
    lat: 33.49, lng: 126.50,
  },
  {
    // Stream: falmouth__school_of_art.mp3 — Falmouth, Cornwall UK
    id: 'reykjavik',
    label: 'Falmouth',
    region: 'Cornwall',
    description: 'Cold coastal & sea light',
    category: 'nature',
    timezone: 'Europe/London',
    lat: 50.15, lng: -5.07,
  },
  {
    // Stream: bern_holli_der_hof.ogg — Holli der Hof farm, Bern, Switzerland
    id: 'alps',
    label: 'Holli der Hof',
    region: 'Bern',
    description: 'Alpine meadow & birdsong',
    category: 'nature',
    timezone: 'Europe/Zurich',
    lat: 46.87, lng: 7.35,
  },
  {
    // Stream: dumfries_and_galloway_loch_patrick.mp3 — Loch Patrick, Scotland
    id: 'bergen',
    label: 'Loch Patrick',
    region: 'Scotland',
    description: 'Loch, reeds & grey sky',
    category: 'nature',
    timezone: 'Europe/London',
    lat: 54.97, lng: -4.24,
  },
  {
    // Stream: jasper_ridge_birdcast.mp3 — Jasper Ridge Biological Preserve, CA
    id: 'seattle',
    label: 'Jasper Ridge',
    region: 'California',
    description: 'West Coast forest & birdsong',
    category: 'nature',
    timezone: 'America/Los_Angeles',
    lat: 37.40, lng: -122.23,
  },
  {
    // Stream: sibra_manoir_bruit.ogg — Sibra village, Ariège, southern France
    id: 'provence',
    label: 'Sibra',
    region: 'Ariège',
    description: 'Pyrenean countryside & silence',
    category: 'nature',
    timezone: 'Europe/Paris',
    lat: 43.09, lng: 1.47,
  },
  // ── Urban (7) ─────────────────────────────────────────────────────────────
  {
    id: 'brussels',
    label: 'Rue de la Poudrière',
    region: 'Brussels',
    description: 'City street & traffic',
    category: 'urban',
    timezone: 'Europe/Brussels',
    lat: 50.85, lng: 4.35,
  },
  {
    id: 'seoul',
    label: 'Gusan-dong',
    region: 'Seoul',
    description: 'Korean neighbourhood',
    category: 'urban',
    timezone: 'Asia/Seoul',
    lat: 37.57, lng: 126.93,
  },
  {
    id: 'santamarta',
    label: 'Poplar',
    region: 'London',
    description: 'East End street & voices',
    category: 'urban',
    timezone: 'Europe/London',
    lat: 51.51, lng: -0.01,
  },
  {
    // Stream: brno_luzanky.mp3 — Lužánky Park, Brno, Czech Republic
    id: 'helsinki',
    label: 'Lužánky Park',
    region: 'Brno',
    description: 'City park & street noise',
    category: 'urban',
    timezone: 'Europe/Prague',
    lat: 49.20, lng: 16.61,
  },
  {
    id: 'lisbon',
    label: 'Chania',
    region: 'Crete',
    description: 'Mediterranean coastal city',
    category: 'urban',
    timezone: 'Europe/Athens',
    lat: 35.51, lng: 24.02,
  },
  {
    id: 'bangkok',
    label: 'Wien',
    region: 'Austria',
    description: 'Riverside venue & city hum',
    category: 'urban',
    timezone: 'Europe/Vienna',
    lat: 48.21, lng: 16.37,
  },
  {
    // Stream: lancaster_ck-flor.mp3 — Lancaster, Northern England
    id: 'edinburgh',
    label: 'Lancaster',
    region: 'England',
    description: 'Northern city & stone streets',
    category: 'urban',
    timezone: 'Europe/London',
    lat: 54.05, lng: -2.80,
  },
]
