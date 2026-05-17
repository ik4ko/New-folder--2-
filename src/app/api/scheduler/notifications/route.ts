import { NextRequest, NextResponse } from 'next/server'
import { notifyVCCDeadlines, sendWeeklyDigests } from '@/lib/email/send-notifications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  try {
    await notifyVCCDeadlines()
    results.vcc = 'ok'
  } catch (err: unknown) {
    results.vcc = `error: ${err instanceof Error ? err.message : String(err)}`
  }

  // Send weekly digests on Mondays only
  const today = new Date()
  if (today.getDay() === 1) {
    try {
      await sendWeeklyDigests()
      results.weekly = 'ok'
    } catch (err: unknown) {
      results.weekly = `error: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    results.weekly = 'skipped (not Monday)'
  }

  return NextResponse.json({ ok: true, ...results })
}
