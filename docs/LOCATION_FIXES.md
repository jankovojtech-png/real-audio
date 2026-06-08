# Location Label Fixes

**Applied:** 2026-06-08  
**Root cause:** Stream IDs were originally chosen to represent a *desired* geographic theme (e.g. `kyoto`, `reykjavik`). When no matching Locus Sonus microphone existed, the nearest active stream was substituted — but the display labels were never updated to reflect the actual source location.

---

## Before / After

| ID | Was label | Was region | Was coords | Now label | Now region | Now coords | Stream file |
|---|---|---|---|---|---|---|---|
| `kyoto` | Kyoto | Japan | 35.01, 135.77 | **Jeju Island** | **South Korea** | **33.49, 126.50** | `jeju_georo.mp3` |
| `reykjavik` | Reykjavík | Iceland | 64.13, −21.90 | **Falmouth** | **Cornwall** | **50.15, −5.07** | `falmouth__school_of_art.mp3` |
| `alps` | Alps | Switzerland | 46.80, 8.23 | **Holli der Hof** | **Bern** | **46.87, 7.35** | `bern_holli_der_hof.ogg` |
| `bergen` | Bergen | Norway | 60.39, 5.32 | **Loch Patrick** | **Scotland** | **54.97, −4.24** | `dumfries_and_galloway_loch_patrick.mp3` |
| `seattle` | Seattle | USA | 47.61, −122.33 | **Jasper Ridge** | **California** | **37.40, −122.23** | `jasper_ridge_birdcast.mp3` |
| `provence` | Provence | France | 43.93, 5.37 | **Sibra** | **Ariège** | **43.09, 1.47** | `sibra_manoir_bruit.ogg` |
| `helsinki` | Helsinki | Finland | 60.17, 24.94 | **Lužánky Park** | **Brno** | **49.20, 16.61** | `brno_luzanky.mp3` |
| `edinburgh` | Edinburgh | Scotland | 55.95, −3.19 | **Lancaster** | **England** | **54.05, −2.80** | `lancaster_ck-flor.mp3` |

---

## Unchanged (already correct)

| ID | Label | Region | Coords | Stream file |
|---|---|---|---|---|
| `knepp` | Knepp Wildland | England | 51.04, −0.47 | `knepp_water.mp3` |
| `kisumu` | Langenholte | Netherlands | 52.51, 6.08 | `zwolle_nature_reserve_langenholte.mp3` |
| `ortler` | Ortler Glacier | Alps | 46.51, 10.54 | `ortler_end_der_welt_ferner.mp3` |
| `scotland` | Gair Wood | Scotland | 57.33, −5.65 | `gair_wood_001.mp3` |
| `marseille` | Île de Frioul | Mediterranean | 43.28, 5.30 | `marseille_frioul.mp3` |
| `brussels` | Rue de la Poudrière | Brussels | 50.85, 4.35 | `bruxelles_rue_de_la_poudriere.mp3` |
| `seoul` | Gusan-dong | Seoul | 37.57, 126.93 | `seoul_gusan.mp3` |
| `santamarta` | Poplar | London | 51.51, −0.01 | `r-urban_poplar.mp3` |
| `lisbon` | Chania | Crete | 35.51, 24.02 | `chania_stream.mp3` |
| `bangkok` | Wien | Austria | 48.21, 16.37 | `flucc_wien.mp3` |

---

## What changed in code

- **`app/lib/locations.ts`** — `label`, `region`, `description`, `timezone`, `lat`, `lng` updated for 8 entries.
- **`app/api/stream/route.ts`** — `label` field in `STREAMS` was already accurate (honest about actual source). No change needed.
- **Stream IDs** (`kyoto`, `reykjavik`, etc.) are **unchanged** to preserve existing share URLs (`/listen/kyoto`). The ID is now treated as an opaque key, not a geographic claim.

---

## Note on stream IDs vs. actual locations

The stream IDs (`kyoto`, `bergen`, `helsinki`, etc.) remain as-is because:
1. Changing them would break all existing share links (`/listen/kyoto`)
2. IDs are internal keys, not the user-facing labels

Users now see the honest location name (e.g. "Jeju Island, South Korea") instead of a fictitious one. The world map dot is now placed at the correct coordinates for the actual microphone.
