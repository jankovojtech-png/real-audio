# Interactive World Map — Real Audio

## Overview

The world map gives Real Audio a "live window into the world" feel. All 18 microphone locations are shown as interactive dots on a real geographic map. Clicking any dot selects that location; the existing location list below remains as a text fallback.

---

## Visual Design

| Element | Appearance |
|---|---|
| Ocean / background | `#05080d` — near-black, slightly blue |
| Country fills | `#0b1623` — very dark navy, subtle separation from ocean |
| Country borders | `#16243a` — barely visible, ~0.4px stroke |
| Default dot | `#1e3050` — dark blue-grey, unobtrusive |
| Nature active dot | `#4ade80` — emerald, matches nature category |
| Urban active dot | `#fbbf24` — amber, matches urban category |
| Active selection ring | Faint ring around the active dot (0.8px, 40% opacity) |
| Live-streaming glow | SVG `feGaussianBlur` drop-shadow on the active dot |
| Reconnecting ring | Dashed amber ring |
| Offline dot | Dark red `#7f1d1d` with a × cross overlay |
| Focus ring (keyboard) | Dashed slate-400 ring (keyboard navigation) |

---

## Map Architecture

### Library
`react-simple-maps@3.0.0` — lightweight D3-geo-based React SVG map library.

**Why react-simple-maps:**
- Pure SVG (no WebGL, no tiles, works fully offline after first load)
- Composable React API (`ComposableMap`, `Geographies`, `Marker`)
- Built-in `projectionConfig` for scale and center adjustment
- ~50KB gzipped (code-split via dynamic import, zero initial bundle impact)

**Note:** The library declares React 18 as a peer dependency but works unchanged with React 19. Installed with `--legacy-peer-deps`.

### World Data
Country outlines are loaded from `jsDelivr CDN`:
```
https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
```
This is the Natural Earth 110m resolution TopoJSON (~200KB raw, ~40KB gzip). Loaded asynchronously on first render; cached by the browser thereafter.

### Projection
Default `geoEqualEarth` projection with:
```typescript
projectionConfig={{ scale: 145, center: [15, 20] }}
```
- `scale: 145` — full world visible at 800×410 SVG units
- `center: [15, 20]` — slightly east-shifted to better center Europe/Asia clusters

### Code Splitting
The entire WorldMap component (library + world data fetch) is lazy-loaded via Next.js `dynamic()`:
```typescript
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => <div ... /> // skeleton placeholder
})
```
`ssr: false` prevents server-side rendering because `react-simple-maps` uses browser SVG APIs.

---

## Interaction

| Action | Result |
|---|---|
| Click dot | Selects location (does NOT autoplay) |
| Click Play | Starts streaming selected location |
| Keyboard Tab | Cycles through all 18 location buttons |
| Enter / Space | Selects focused location |
| Focus visible | Dashed ring around focused dot |

Each dot is a `<circle>` with:
```html
role="button"
tabIndex={0}
aria-label="Listen live from Knepp Wildland, England"
aria-pressed={isActive}
```

An invisible enlarged tap target (`r=18` = ~9px on 280px wide screen) improves touch accuracy on mobile.

---

## Health State Visual Mapping

| Stream health | Map appearance |
|---|---|
| `unknown` | Dark default dot |
| `connecting` | Category-colored dot + soft glow |
| `live` | Category-colored dot + strong glow + outer halo |
| `reconnecting` | Category-colored dot + dashed amber ring |
| `offline` | Dark red dot + × cross |

---

## Coordinates Reference

| ID | Location | Lat | Lng |
|---|---|---|---|
| knepp | Knepp Wildland, England | 51.04 | -0.47 |
| kisumu | Langenholte, Netherlands | 52.51 | 6.08 |
| ortler | Ortler Glacier, Alps | 46.51 | 10.54 |
| scotland | Gair Wood, NW Scotland | 57.33 | -5.65 |
| marseille | Île de Frioul, Mediterranean | 43.28 | 5.30 |
| kyoto | Kyoto, Japan | 35.01 | 135.77 |
| reykjavik | Reykjavík, Iceland | 64.13 | -21.90 |
| alps | Swiss Alps | 46.80 | 8.23 |
| bergen | Bergen, Norway | 60.39 | 5.32 |
| seattle | Seattle, USA | 47.61 | -122.33 |
| provence | Provence, France | 43.93 | 5.37 |
| brussels | Brussels, Belgium | 50.85 | 4.35 |
| seoul | Gusan-dong, Seoul | 37.57 | 126.93 |
| santamarta | Poplar, London | 51.51 | -0.01 |
| helsinki | Helsinki, Finland | 60.17 | 24.94 |
| lisbon | Chania, Crete | 35.51 | 24.02 |
| bangkok | Wien, Austria | 48.21 | 16.37 |
| edinburgh | Edinburgh, Scotland | 55.95 | -3.19 |

---

## File Map

```
app/
├── lib/
│   └── locations.ts       ← added lat + lng to Location interface + all 18 entries
├── components/
│   ├── WorldMap.tsx        ← map component (react-simple-maps, SVG, markers)
│   └── AudioPlayer.tsx     ← imports WorldMap via dynamic(), renders above location list
```

---

## Known Limitations

- **CDN dependency**: world country outlines are loaded from jsDelivr. If CDN is unreachable (e.g., corporate firewalls), the map renders with dots but no country outlines. The location list below is always available as a fallback.
- **Touch dot size**: on a 280px-wide screen, the SVG rendering maps the 18-unit tap target to ~8px physical. Small but functional; a full-screen map view would allow larger hit areas.
- **No zoom/pan**: the map is a static world overview. Clusters in western Europe (knepp, kisumu, brussels, santamarta, alps, ortler, bergen, marseille, provence, edinburgh, scotland, vienna) are close together on a world scale. A zoom-on-click enhancement could improve selection accuracy.
- **Peer dependency warning**: `react-simple-maps@3.0.0` declares React 18 as its maximum peer. The library works fine with React 19 but `npm install` requires `--legacy-peer-deps`.
