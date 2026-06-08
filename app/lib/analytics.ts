// SERVER-ONLY — never import this file from client components or Edge routes.
// Uses Node.js built-ins: fs, path.

import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

// ── Storage path ──────────────────────────────────────────────────────────────
// Override DATA_DIR env var to point at a persistent volume in production.
// e.g. DATA_DIR=/data on Render with a mounted disk.
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
mkdirSync(DATA_DIR, { recursive: true })
const LOG_FILE = path.join(DATA_DIR, 'events.ndjson')

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AnalyticsEvent {
  event:     string
  location?: string
  value?:    number
  sid?:      string   // ephemeral session ID (cleared on tab close)
  ts:        number   // Unix ms
}

// ── Write ─────────────────────────────────────────────────────────────────────
// appendFileSync is safe here: Node.js is single-threaded for sync I/O,
// so concurrent requests won't interleave a single JSON line.
export function appendEvent(evt: AnalyticsEvent): void {
  try {
    appendFileSync(LOG_FILE, JSON.stringify(evt) + '\n', 'utf8')
  } catch {
    // Disk full or permission error — silently ignore. Analytics must not
    // break the stream API.
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────
function readAllEvents(): AnalyticsEvent[] {
  if (!existsSync(LOG_FILE)) return []
  try {
    return readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try   { return [JSON.parse(line) as AnalyticsEvent] }
        catch { return [] }
      })
  } catch {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function toDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

// ── Report ────────────────────────────────────────────────────────────────────
export function buildReport() {
  const events = readAllEvents()

  // ── Most listened locations ────────────────────────────────────────────────
  const playCounts = new Map<string, number>()
  events
    .filter((e) => e.event === 'play_start' && e.location)
    .forEach((e) => {
      const k = e.location!
      playCounts.set(k, (playCounts.get(k) ?? 0) + 1)
    })
  const top_locations = [...playCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([location, plays]) => ({ location, plays }))

  // ── Average listening time ─────────────────────────────────────────────────
  const durations = events
    .filter((e) => e.event === 'play_stop' && typeof e.value === 'number' && e.value > 0)
    .map((e) => e.value!)
  const avg_seconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

  // ── Daily active listeners ─────────────────────────────────────────────────
  // Counts unique session IDs that started a play each day.
  // "Listener" = one browser session (sessionStorage, cleared on tab close).
  const dailySessions = new Map<string, Set<string>>()
  events
    .filter((e) => e.event === 'play_start')
    .forEach((e) => {
      const day = toDay(e.ts)
      if (!dailySessions.has(day)) dailySessions.set(day, new Set())
      dailySessions.get(day)!.add(e.sid ?? `anon-${e.ts}`)
    })
  const daily_active = [...dailySessions.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .map(([day, sids]) => ({ day, listeners: sids.size }))

  // ── Event totals ───────────────────────────────────────────────────────────
  const totals = new Map<string, number>()
  events.forEach((e) => totals.set(e.event, (totals.get(e.event) ?? 0) + 1))
  const event_totals = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([event, count]) => ({ event, count }))

  return {
    total_events:            events.length,
    top_locations,
    avg_listen_seconds:      avg_seconds,
    avg_listen_formatted:    formatDuration(avg_seconds),
    daily_active,
    event_totals,
    generated_at:            new Date().toISOString(),
  }
}
