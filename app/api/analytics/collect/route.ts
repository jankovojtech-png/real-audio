import { type NextRequest } from 'next/server'
import { appendEvent } from '@/app/lib/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_EVENTS = new Set([
  'pageview',
  'location_select',
  'play_start',
  'play_stop',
  'share_click',
  'sleep_timer_set',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, location, value, sid } = body as Record<string, unknown>

    if (typeof event !== 'string' || !VALID_EVENTS.has(event)) {
      return Response.json({ error: 'invalid_event' }, { status: 400 })
    }

    appendEvent({
      event,
      location: typeof location === 'string' ? location.slice(0, 50)  : undefined,
      value:    typeof value    === 'number'  ? Math.round(Math.abs(Math.min(value, 86_400))) : undefined,
      sid:      typeof sid      === 'string'  ? sid.slice(0, 36)       : undefined,
      ts:       Date.now(),
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
}
