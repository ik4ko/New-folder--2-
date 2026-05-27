import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function resolveAgencyId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: brokerRow } = await supabase
    .from('brokers')
    .select('agency_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (brokerRow?.agency_id) return brokerRow.agency_id

  const { data: agencyRow } = await supabase
    .from('agencies')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()
  return agencyRow?.id ?? null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agencyId = await resolveAgencyId(user.id)
  if (!agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const ids: string[] = body.ids ?? []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch members scoped to agency
  const { data: members } = await service
    .from('book_of_business')
    .select('id, mbi')
    .in('id', ids)
    .eq('agency_id', agencyId)

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No matching members found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const withMbi    = members.filter(m => m.mbi).map(m => m.id)
  const withoutMbi = members.filter(m => !m.mbi).map(m => m.id)

  const updates: Promise<unknown>[] = []

  if (withMbi.length > 0) {
    updates.push(
      service.from('book_of_business').update({
        verification_status: 'verified',
        last_marx_check:     now,
        last_verified_at:    now,
      }).in('id', withMbi)
    )
  }

  if (withoutMbi.length > 0) {
    updates.push(
      service.from('book_of_business').update({
        verification_status: 'missing',
      }).in('id', withoutMbi)
    )
  }

  await Promise.all(updates)
  return NextResponse.json({ verified: withMbi.length, missing: withoutMbi.length })
}
