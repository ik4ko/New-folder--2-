import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServiceClient } from '@/lib/supabase/service'
import { checkSeatLimit } from '@/lib/billing/seat-guard'
import { sendTeamInviteEmail } from '@/lib/email/send-notifications'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve agency and verify admin role
    let agencyId: string | null = null
    let maxAdminSeats = 3

    const { data: agency } = await supabase
      .from('agencies')
      .select('id, max_admin_seats')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (agency) {
      agencyId = agency.id
      maxAdminSeats = agency.max_admin_seats ?? 3
    } else {
      const { data: broker } = await supabase
        .from('brokers')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!broker || broker.role !== 'agency_admin') {
        return NextResponse.json({ error: 'Forbidden: agency_admin role required' }, { status: 403 })
      }
      agencyId = broker.agency_id

      const { data: agencyData } = await supabase
        .from('agencies')
        .select('max_admin_seats')
        .eq('id', agencyId)
        .maybeSingle()
      maxAdminSeats = agencyData?.max_admin_seats ?? 3
    }

    const body = await req.json()
    const { email, npn, role: inviteRole = 'broker' } = body as {
      email: string
      first_name?: string
      last_name?: string
      npn?: string
      role?: string
    }

    // Derive name from email prefix when not explicitly supplied (e.g. bulk invites)
    const first_name = (body.first_name as string | undefined)?.trim() || email.split('@')[0]
    const last_name  = (body.last_name  as string | undefined)?.trim() || ''

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    // agency_owner cannot be invited (only 1 per agency)
    if (inviteRole === 'agency_owner') {
      return NextResponse.json({ error: 'agency_owner cannot be invited -- only 1 per agency' }, { status: 400 })
    }

    // Seat limit check for agency_admin invites (custom admin-seat cap)
    if (inviteRole === 'agency_admin') {
      const { count: adminCount } = await supabase
        .from('brokers')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .in('role', ['agency_admin', 'agency_owner'])

      if ((adminCount ?? 0) >= maxAdminSeats) {
        return NextResponse.json(
          { error: `Admin seat limit reached (${adminCount}/${maxAdminSeats})` },
          { status: 403 }
        )
      }
    }

    // Seat limit check for broker invites — enforced at the write layer so a
    // direct API call cannot bypass the UI pre-flight gate (/api/team/seat-check).
    // This is the authoritative enforcement point; the seat-check endpoint is
    // purely informational for the frontend.
    if (inviteRole !== 'agency_admin') {
      const svc = createServiceClient()
      const seatResult = await checkSeatLimit(agencyId!, user.id)
      if (!seatResult.allowed) {
        return NextResponse.json(
          {
            error:       seatResult.userMessage,
            reason:      seatResult.reason,
            tier:        seatResult.tier,
            upgradeUrl:  '/settings/billing',
          },
          { status: 402 }
        )
      }
    }

    // Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { first_name, last_name, agency_id: agencyId },
        redirectTo: `${APP_URL}/dashboard`,
      }
    )

    if (inviteError) {
      console.error('[team/invite] invite error:', inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    const invitedUserId = inviteData.user?.id
    if (!invitedUserId) {
      return NextResponse.json({ error: 'Invite succeeded but no user ID returned' }, { status: 500 })
    }

    // Insert broker record immediately using the new user's UUID
    const { data: brokerRow, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .insert({
        agency_id: agencyId,
        user_id: invitedUserId,
        first_name,
        last_name,
        email,
        npn: npn ?? null,
        role: inviteRole === 'agency_admin' ? 'agency_admin' : 'broker',
      })
      .select('id, user_id, first_name, last_name, email, role, npn, created_at')
      .single()

    if (brokerError) {
      console.error('[team/invite] broker insert error:', brokerError)
      return NextResponse.json({ error: brokerError.message }, { status: 500 })
    }

    // Record in agency_invites for pending-invites display
    await supabaseAdmin.from('agency_invites').insert({
      agency_id: agencyId,
      email,
      role: inviteRole === 'agency_admin' ? 'agency_admin' : 'broker',
      status: 'pending',
      invited_by: user.id,
    }).then(() => {}) // non-fatal if table doesn't exist yet

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      agency_id: agencyId,
      user_id: user.id,
      action: 'BROKER_INVITED',
      resource_type: 'brokers',
      resource_id: brokerRow.id,
      metadata: { invited_email: email, invited_user_id: invitedUserId, role: inviteRole },
    })

    // Send invite notification email (non-fatal)
    try {
      const [{ data: inviter }, { data: agencyData }] = await Promise.all([
        supabaseAdmin.from('brokers').select('first_name, last_name').eq('user_id', user.id).maybeSingle(),
        supabaseAdmin.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
      ])
      const inviterName = inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Your agency admin'
      const agencyName = agencyData?.name ?? 'AegisSage'
      sendTeamInviteEmail({
        inviteeEmail: email,
        inviterName,
        agencyName,
        role: inviteRole,
        inviteUrl: `${APP_URL}/dashboard`,
      }).catch(() => {})
    } catch { /* non-fatal */ }

    return NextResponse.json({ broker: { ...brokerRow, assignedCount: 0 } }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[team/invite] unexpected error:', msg)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
