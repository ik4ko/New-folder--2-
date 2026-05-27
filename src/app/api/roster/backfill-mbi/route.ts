import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptCredential } from '@/lib/crypto-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: members, error } = await supabase
    .from('book_of_business')
    .select('id, mbi_encrypted')
    .is('mbi', null)
    .not('mbi_encrypted', 'is', null)

  if (error) {
    console.error('[backfill-mbi] fetch error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let decrypted = 0
  let failed = 0

  for (const member of members ?? []) {
    try {
      const plainMbi = decryptCredential(member.mbi_encrypted)
      if (plainMbi && plainMbi.length >= 9) {
        await supabase
          .from('book_of_business')
          .update({ mbi: plainMbi, member_id: plainMbi })
          .eq('id', member.id)
        decrypted++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  console.log('[backfill-mbi] done | decrypted:', decrypted, '| failed:', failed)
  return NextResponse.json({ decrypted, failed, total: (members ?? []).length })
}
