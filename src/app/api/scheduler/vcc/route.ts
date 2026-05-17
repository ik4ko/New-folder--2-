import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendFax } from '@/lib/vcc/fax-dispatcher'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('vcc_submissions')
    .select('id, doctor_fax, pdf_url, carrier')
    .eq('fax_status', 'scheduled')
    .lte('send_scheduled_at', now)

  if (error) {
    console.error('[scheduler/vcc] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const sub of due ?? []) {
    try {
      if (sub.doctor_fax && sub.pdf_url) {
        await sendFax({ faxNumber: sub.doctor_fax, pdfUrl: sub.pdf_url, submissionId: sub.id })
        await supabase.from('vcc_submissions').update({ fax_status: 'sent' }).eq('id', sub.id)
        sent++
      } else {
        await supabase.from('vcc_submissions').update({ fax_status: 'failed' }).eq('id', sub.id)
        failed++
      }
    } catch (e: any) {
      console.error('[scheduler/vcc] fax error for', sub.id, e.message)
      await supabase.from('vcc_submissions').update({ fax_status: 'failed' }).eq('id', sub.id)
      failed++
    }
  }

  return NextResponse.json({ processed: (due ?? []).length, sent, failed })
}
