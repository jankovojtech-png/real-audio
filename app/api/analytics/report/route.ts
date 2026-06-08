import { type NextRequest } from 'next/server'
import { buildReport } from '@/app/lib/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The report endpoint is always protected.
// ANALYTICS_SECRET must be set in the environment; if it is missing the
// endpoint returns 404 so it cannot be discovered or probed.
export async function GET(request: NextRequest) {
  const secret = process.env.ANALYTICS_SECRET

  if (!secret) {
    // Secret not configured — treat the endpoint as non-existent.
    return new Response(null, { status: 404 })
  }

  const key = request.nextUrl.searchParams.get('key')
  if (key !== secret) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const report = buildReport()
    return Response.json(report, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return Response.json(
      { error: 'report_failed', detail: String(err) },
      { status: 500 },
    )
  }
}
