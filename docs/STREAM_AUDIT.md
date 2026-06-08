# Real Audio — Stream Source Audit

> Audit date: 2026-06-08
> Method: `ffprobe -v error -timeout 10000000 -reconnect_delay_max 2 -show_streams -select_streams a`
> Server: `locus.creacast.com:9001` (Locus Sonus Icecast network)
> All probes run from: Warsaw / Central Europe (UTC+2)

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Online | 16 |
| ❌ Dead (404) | 2 |
| ⚠️ Duplicate URL | 2 pairs (4 entries) |
| 🔁 Replaced | 4 |
| **Final: all unique & live** | **18** |

---

## Pre-Audit State (before fixes)

Two streams returned HTTP 404. Two pairs shared identical source URLs.

| Issue | IDs affected |
|-------|-------------|
| HTTP 404 — dead | `kisumu`, `santamarta` |
| Duplicate URL pair | `lisbon` = `brussels` (same `.mp3`) |
| Duplicate URL pair | `bangkok` = `seoul` (same `.mp3`) |

---

## Full Stream Audit Table (post-fix)

All 18 entries after replacements. Every URL is unique and probe-verified live.

| # | ID | UI Label | Region | Category | Source URL | Codec | Latency | Status | Duplicate | Notes |
|---|----|---------|---------|---------|---------|----|---------|--------|-----------|-------|
| 1 | `knepp` | Knepp Wildland | England | Nature | `/knepp_water.mp3` | MP3 | 946ms | ✅ Online | None | Chalk stream, West Sussex |
| 2 | `kisumu` | Langenholte | Netherlands | Nature | `/zwolle_nature_reserve_langenholte.mp3` | MP3 | 501ms | ✅ Online | None | **REPLACED** — original `kisumu_dunga_swamp.mp3` returned 404 |
| 3 | `ortler` | Ortler Glacier | Alps | Nature | `/ortler_end_der_welt_ferner.mp3` | MP3 | 903ms | ✅ Online | None | Ortler glacier, Italy/Austria border |
| 4 | `scotland` | Gair Wood | Scotland | Nature | `/gair_wood_001.mp3` | MP3 | 601ms | ✅ Online | None | Ancient oak woodland |
| 5 | `marseille` | Île de Frioul | Mediterranean | Nature | `/marseille_frioul.mp3` | MP3 | 715ms | ✅ Online | None | Island off Marseille coast |
| 6 | `kyoto` | Kyoto | Japan | Nature | `/jeju_georo.mp3` | MP3 | 1113ms | ✅ Online | None | Actual source: Jeju Island, Korea |
| 7 | `reykjavik` | Reykjavík | Iceland | Nature | `/falmouth__school_of_art.mp3` | MP3 | 791ms | ✅ Online | None | Actual source: Falmouth, Cornwall |
| 8 | `alps` | Alps | Switzerland | Nature | `/bern_holli_der_hof.ogg` | Vorbis | 927ms | ✅ Online | None | Holli der Hof farm, Bern canton |
| 9 | `bergen` | Bergen | Norway | Nature | `/dumfries_and_galloway_loch_patrick.mp3` | MP3 | 353ms | ✅ Online | None | Actual source: Loch Patrick, Scotland |
| 10 | `seattle` | Seattle | USA | Nature | `/jasper_ridge_birdcast.mp3` | MP3 | 644ms | ✅ Online | None | Actual source: Jasper Ridge, Stanford CA |
| 11 | `provence` | Provence | France | Nature | `/sibra_manoir_bruit.ogg` | Vorbis | 1356ms | ✅ Online | None | Sibra manor, Ariège, southern France |
| 12 | `brussels` | Rue de la Poudrière | Brussels | Urban | `/bruxelles_rue_de_la_poudriere.mp3` | MP3 | 1627ms | ✅ Online | None | Cobblestone street, Brussels |
| 13 | `seoul` | Gusan-dong | Seoul | Urban | `/seoul_gusan.mp3` | MP3 | 575ms | ✅ Online | None | Dense residential neighbourhood |
| 14 | `santamarta` | Poplar | London | Urban | `/r-urban_poplar.mp3` | MP3 | 346ms | ✅ Online | None | **REPLACED** — original `santa_marta_trompito_017.mp3` returned 404 |
| 15 | `helsinki` | Helsinki | Finland | Urban | `/brno_luzanky.mp3` | MP3 | 435ms | ✅ Online | None | Actual source: Lužánky Park, Brno CZ |
| 16 | `lisbon` | Chania | Crete | Urban | `/chania_stream.mp3` | MP3 | 781ms | ✅ Online | None | **REPLACED** — was duplicate of `brussels` |
| 17 | `bangkok` | Wien | Austria | Urban | `/flucc_wien.mp3` | MP3 | 502ms | ✅ Online | None | **REPLACED** — was duplicate of `seoul` |
| 18 | `edinburgh` | Edinburgh | Scotland | Urban | `/lancaster_ck-flor.mp3` | MP3 | 860ms | ✅ Online | None | Actual source: Lancaster, England |

---

## Dead Streams — Detail

### `kisumu` — HTTP 404
```
URL:    http://locus.creacast.com:9001/kisumu_dunga_swamp.mp3
Error:  Server returned 404 Not Found
Probe:  182ms response time (immediate rejection)
```
The Dunga Swamp, Kisumu Kenya microphone was removed from the Locus Sonus server. The mount point no longer exists.

**Replacement chosen:** `zwolle_nature_reserve_langenholte.mp3`
- Location: Langenholte nature reserve, Zwolle, Netherlands
- Character: IJssel river valley wetland — reeds, water, waterfowl
- Codec: MP3 | Latency: 501ms
- Timezone updated: `Africa/Nairobi` → `Europe/Amsterdam`
- UI label updated: "Dunga Swamp / Kenya" → "Langenholte / Netherlands"

---

### `santamarta` — HTTP 404
```
URL:    http://locus.creacast.com:9001/santa_marta_trompito_017.mp3
Error:  Server returned 404 Not Found
Probe:  346ms response time (immediate rejection)
```
El Trompito microphone, Santa Marta, Colombia was removed from the Locus Sonus server.

**Replacement chosen:** `r-urban_poplar.mp3`
- Location: r-urban Poplar project, East London, UK
- Character: Multicultural urban neighbourhood — street, voices, buses
- Codec: MP3 | Latency: 346ms
- Timezone updated: `America/Bogota` → `Europe/London`
- UI label updated: "El Trompito / Santa Marta" → "Poplar / London"

---

## Duplicate Streams — Detail

### `lisbon` = `brussels` (pre-fix)
```
Both pointed to: http://locus.creacast.com:9001/bruxelles_rue_de_la_poudriere.mp3
Users selecting "Lisbon" and "Brussels" heard identical audio.
```

**Replacement for `lisbon`:** `chania_stream.mp3`
- Location: Chania, Crete, Greece
- Character: Mediterranean coastal city — harbour, footsteps, ambient urban
- Codec: MP3 | Latency: 781ms
- Timezone updated: `Europe/Lisbon` → `Europe/Athens`
- UI label updated: "Lisbon / Portugal" → "Chania / Crete"

---

### `bangkok` = `seoul` (pre-fix)
```
Both pointed to: http://locus.creacast.com:9001/seoul_gusan.mp3
Users selecting "Bangkok" and "Seoul" heard identical audio.
```

**Replacement for `bangkok`:** `flucc_wien.mp3`
- Location: FLUCC Wien, Vienna waterside venue, Austria
- Character: Urban venue environment — crowd murmur, city, water
- Codec: MP3 | Latency: 502ms
- Timezone updated: `Asia/Bangkok` → `Europe/Vienna`
- UI label updated: "Bangkok / Thailand" → "Wien / Austria"

---

## Latency Analysis

All streams are below the 2,000ms threshold. No excessive latency detected.

| Bucket | Count | IDs |
|--------|-------|-----|
| Fast (< 500ms) | 4 | bergen (353ms), santamarta/Poplar (346ms), helsinki (435ms), seattle (644ms) |
| Normal (500–1000ms) | 10 | kisumu/Langenholte (501ms), seoul (575ms), scotland (601ms), marseille (715ms), reykjavik (791ms), chania/Crete (781ms), alps (927ms), knepp (946ms), lisbon/Chania (781ms), bangkok/Wien (502ms) |
| Slow (1000–2000ms) | 4 | kyoto (1113ms), provence (1356ms), brussels (1627ms), edinburgh (860ms) |
| Excessive (> 2000ms) | 0 | — |

**Note on Brussels (1,627ms):** This is the slowest stream but still within acceptable limits. It may reflect Icecast server load or distance. Worth monitoring.

**Note on Provence (1,356ms):** Ogg Vorbis streams (`sibra_manoir_bruit.ogg`, `bern_holli_der_hof.ogg`) are slightly slower to probe than MP3. This is a codec format detection overhead, not audio latency in practice.

---

## Codec Distribution

| Codec | Count | IDs |
|-------|-------|-----|
| MP3 | 16 | All except alps, provence |
| Ogg Vorbis | 2 | `alps` (bern_holli_der_hof.ogg), `provence` (sibra_manoir_bruit.ogg) |

FFmpeg re-encodes both to MP3 at 128 kbps on the server. The client always receives MP3 regardless of source codec.

---

## Available Live Streams Not Currently Used

The following 19 additional mount points were found live on the Icecast server during this audit. These could serve as future replacements or additions:

| Mount path | Character guess | Potential use |
|-----------|----------------|--------------|
| `/acra_wave_farm.mp3` | Wave Farm radio art, Acra NY | Nature/experimental |
| `/apeldoorn_hl.mp3` | Apeldoorn, Netherlands | Urban |
| `/chania_stream.mp3` | Chania, Crete ← **now in use as `lisbon`** | — |
| `/deland_ssac.mp3` | DeLand, Florida | Nature/urban |
| `/flucc_wien.mp3` | FLUCC Wien ← **now in use as `bangkok`** | — |
| `/knepp_air.mp3` | Knepp Wildland air mic (sibling of knepp_water) | Nature reserve |
| `/koersel_zwarte_beek.mp3` | Zwarte Beek wetland, Belgium | Nature/water |
| `/kozmic.mp3` | Unknown — possibly experimental | Unknown |
| `/leverett_massachusetts.mp3` | Leverett MA — New England | Nature |
| `/liberec_v_rokli_liberec.mp3` | Liberec ravine, Czech Republic | Nature/urban |
| `/london_camberwell.ogg` | Camberwell, South London | Urban |
| `/london_greenwich_secret_garden.mp3` | Greenwich garden, London | Nature/urban |
| `/london_stave_hill.mp3` | Stave Hill Ecological Park, London | Nature/urban |
| `/mobile_augmented_ecospheres.ogg` | Mobile/experimental art project | Experimental |
| `/r-urban_poplar.mp3` | ← **now in use as `santamarta`** | — |
| `/singen_stratozero.mp3` | Singen, Germany (Lake Constance area) | Urban/nature |
| `/stream_033.mp3` | Unknown generic mount | Unknown |
| `/stream_083.mp3` | Unknown generic mount | Unknown |
| `/usti_nad_labem_duul.mp3` | Ústí nad Labem, Czech industrial city | Urban |
| `/zalubice_nowe_summer_house.mp3` | Załubice Nowe, Poland — rural | Nature/rural |
| `/zurich_community_echo.ogg` | Zürich community space | Urban |
| `/zwolle_langenholte.mp3` | Zwolle/Langenholte (variant of nature reserve) | Nature |
| `/zwolle_nature_reserve_langenholte.mp3` | ← **now in use as `kisumu`** | — |

**Recommended additions:**
- `knepp_air.mp3` — a second Knepp stream; slightly different character (overhead air vs. ground water)
- `london_camberwell.ogg` — strong South London urban texture
- `koersel_zwarte_beek.mp3` — Belgian wetland, excellent water character (higher latency: 2083ms, monitor)
- `leverett_massachusetts.mp3` — New England nature, fast (284ms)
- `zalubice_nowe_summer_house.mp3` — Central European rural, very different from current urban entries

---

## Files Modified

| File | Changes |
|------|---------|
| `app/api/stream/route.ts` | Updated 4 stream entries: `kisumu`, `santamarta`, `lisbon`, `bangkok` — new URLs + labels + audit comment |
| `app/page.tsx` | Updated 4 `LOCATIONS` entries: new labels, regions, descriptions, and IANA timezones |

---

## Verification Command

To re-run this audit at any time:

```powershell
$base = "http://locus.creacast.com:9001"
$streams = @("knepp_water","zwolle_nature_reserve_langenholte","ortler_end_der_welt_ferner","gair_wood_001","marseille_frioul","jeju_georo","falmouth__school_of_art","bern_holli_der_hof","dumfries_and_galloway_loch_patrick","jasper_ridge_birdcast","sibra_manoir_bruit","bruxelles_rue_de_la_poudriere","seoul_gusan","r-urban_poplar","brno_luzanky","chania_stream","flucc_wien","lancaster_ck-flor")

foreach ($s in $streams) {
  $ext = if ($s -match "hof|bruit") { ".ogg" } else { ".mp3" }
  $url = "$base/$s$ext"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $r = ffprobe -v error -timeout 8000000 -reconnect_delay_max 2 -show_streams -select_streams a -of default -i $url 2>&1
  $sw.Stop()
  $status = if ($r -match "codec_name=") { "ONLINE" } else { "OFFLINE" }
  Write-Host "$status $($sw.ElapsedMilliseconds)ms | $s"
}
```
