# Sleep Timer — Real Audio

## Overview

The sleep timer automatically stops audio playback after a user-chosen duration, with a smooth 10-second volume fade at the end. It is designed to be used at bedtime or anytime you want the stream to stop unattended.

---

## User Flow

1. Choose a duration: **15m · 30m · 60m · 90m**
2. The countdown starts immediately (even if audio is not yet playing).
3. The chosen button is highlighted; all others are dimmed.
4. A countdown line appears below the row: `Stops in 28:34`
5. In the final 10 seconds, the line changes to: `Fading out… 7s` and volume fades smoothly to near-zero.
6. At t=0 the stream is stopped and all timer state is cleared.
7. Tap **Off** or the highlighted option again at any time to cancel.

---

## State Machine

```
                  user selects duration
         ┌──────────────────────────────────┐
         │                                  ▼
  [ Off / idle ]               [ Counting down ]
         ▲                           │
         │  cancel / stop /          │  t ≤ 10s
         │  timer fires              ▼
         │                   [ Fading out ]
         │                           │
         └───────────────────────────┘
                 t = 0  → stopStream()
```

---

## Timer Behavior

| Situation | Timer behavior |
|---|---|
| User sets timer while idle | Countdown starts; fires even if never playing |
| User presses Play after setting timer | Countdown continues; audio fades when near end |
| User switches stream mid-timer | Timer keeps counting; volume restored to 1.0 on new stream |
| User presses Stop | Timer cleared completely |
| Timer reaches zero | Audio stopped; timer cleared; volume restored |
| User cancels timer (Off / re-click) | Timer cleared; volume restored |

---

## Fade-out Algorithm

The fade runs inside the 1-second countdown interval:

```
audioElement.volume = remainingSeconds / FADE_SECONDS   (when remaining ≤ 10)
```

This produces 10 linear steps from 1.0 → 0.1, ending with a `stopStream()` call.
Volume is always restored to `1.0` on cancel, stream switch, or unmount.

---

## Implementation Details

### Constants (`app/page.tsx`)

```typescript
const SLEEP_OPTIONS = [15, 30, 60, 90] as const   // minutes
const FADE_SECONDS  = 10                            // seconds before end to begin fade
```

### New Refs

| Ref | Type | Purpose |
|---|---|---|
| `sleepEndsAtRef` | `number \| null` | Absolute wall-clock timestamp when timer fires |
| `sleepIntervalRef` | `setInterval handle` | 1-second countdown interval |

Using a wall-clock timestamp (`Date.now() + duration`) instead of a decrementing counter means the timer stays accurate across tab suspension or event loop delays.

### New State

| State | Type | Purpose |
|---|---|---|
| `sleepMinutes` | `number \| null` | Currently selected duration (drives button highlight) |
| `sleepSecondsLeft` | `number \| null` | Remaining seconds for display only |

### `handleSleepTimer(minutes: number | null)`

- Clears any existing interval and restores volume.
- If `minutes === null`: turns timer off.
- Otherwise: records `sleepEndsAt`, starts 1-second interval, updates display state.

### `stopStream` (modified)

Added at the top of `stopStream`:
```typescript
clearInterval(sleepIntervalRef.current)
sleepEndsAtRef.current = null
if (audioRef.current) audioRef.current.volume = 1
setSleepMinutes(null)
setSleepSecondsLeft(null)
```

This ensures the timer is always cleared when playback stops for any reason (user action, stream error, component unmount).

---

## Memory Leak Prevention

- All intervals are stored in `sleepIntervalRef` and cleared before a new one starts.
- `sleepIntervalRef` is cleared inside `stopStream`, which is called on component unmount via `useEffect(() => () => stopStream(), [stopStream])`.
- The interval callback checks `sleepEndsAtRef.current === null` as a guard; if `stopStream` runs concurrently (e.g., stream error during countdown), the interval becomes a no-op on the next tick.

---

## UI Placement

```
┌─────────────────────────────────┐
│         REAL AUDIO              │
│      Live ambient stream        │
│                                 │
│            [ ▶ ]                │
│                                 │
│           Streaming live        │
│                                 │
│  Sleep  [15m][30m][60m][90m][Off]  ← always visible
│           Stops in 28:34        ← shown when timer active
│                                 │
│  Nature  ─────────────────      │
│  · Knepp Wildland  …            │
│  …                              │
└─────────────────────────────────┘
```

---

## Known Limitations

- **Tab/phone sleep**: The countdown uses `Date.now()` snapshots so it remains accurate even if the tab was in the background. However, if the device suspends the JavaScript engine completely, the interval may fire late by however long the device was suspended. The audio fade will still complete correctly on the next tick.
- **No persistence**: The timer is not saved to `localStorage`. If the user reloads the page, the timer is reset.
- **Granularity**: Volume fades in 1-second steps (10 steps total). This is intentional — at bedtime, a coarse fade is imperceptible and avoids the complexity of a 100ms sub-interval.
