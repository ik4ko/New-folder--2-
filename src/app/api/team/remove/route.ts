import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const brokerId = req.nextUrl.searchParams.get('brokerId')
    if (!brokerId) return NextResponse.json({ error: 'brokerId query param required' }, { status: 400 })

    // Resolve agency and verify admin role
    let agencyId: string | null = null

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (agency) {
      agencyId = agency.id
    } else {
      const { data: callerBroker } = await supabase
        .from('brokers')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!callerBroker || callerBroker.role !== 'agency_admin') {
        return NextResponse.json({ error: 'Forbidden: agency_admin role required' }, { status: 403 })
      }
      agencyId = callerBroker.agency_id
    }

    // Verify the broker being removed belongs to the same agency
    const { data: target } = await supabaseAdmin
      .from('brokers')
      .select('id, user_id, first_name, last_name, agency_id')
      .eq('id', brokerId)
      .maybeSingle()

    if (!target || target.agency_id !== agencyId) {
      return NextResponse.json({ error: 'Broker not found in this agency' }, { status: 404 })
    }

    // Unassign their contacts
    await supabaseAdmin
      .from('ghl_contacts')
      .update({ assigned_broker_id: null })
      .eq('agency_id', agencyId)
      .eq('assigned_broker_id', target.user_id)

    // Delete broker record
    const { error: deleteError } = await supabaseAdmin
      .from('brokers')
      .delete()
      .eq('id', brokerId)

    if (deleteError) {
      console.error('[team/remove] delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      agency_id: agencyId,
      user_id: user.id,
      action: 'BROKER_REMOVED',
      resource_type: 'brokers',
      resource_id: brokerId,
      metadata: { removed_user_id: target.user_id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[team/remove] unexpected error:', err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
