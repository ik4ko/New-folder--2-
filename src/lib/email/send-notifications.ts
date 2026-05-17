import { getResend, FROM_EMAIL } from './resend-client'
import {
  switchAlertEmail, vccDeadlineEmail, aorSignedEmail,
  teamInviteEmail, weeklyDigestEmail,
} from './templates'
import { createServiceClient } from '@/lib/supabase/service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.aegissage.com'

// ── 1. Switch Alerts ───────────────────────────────────────────────────────
// Called after diffRosterAgainstGHL — sends one email per broker per upload

export async function notifyNewSwitchAlerts(uploadId: string, agencyId: string): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Fetch only critical (missing_from_roster) alerts for this upload
    const { data: alerts } = await supabase
      .from('switch_alerts')
      .select('id, broker_id, ghl_contact_id, carrier, alert_type')
      .eq('upload_id', uploadId)
      .eq('agency_id', agencyId)
      .eq('alert_type', 'missing_from_roster')
      .eq('status', 'open')

    if (!alerts?.length) return

    // Group by broker_id
    const byBroker = new Map<string, typeof alerts>()
    for (const a of alerts) {
      if (!a.broker_id) continue
      if (!byBroker.has(a.broker_id)) byBroker.set(a.broker_id, [])
      byBroker.get(a.broker_id)!.push(a)
    }

    for (const [brokerId, brokerAlerts] of byBroker) {
      const { data: broker } = await supabase
        .from('brokers')
        .select('first_name, last_name, email')
        .eq('id', brokerId)
        .maybeSingle()

      if (!broker?.email) continue

      // Fetch contact names in batch
      const contactIds = brokerAlerts.map(a => a.ghl_contact_id)
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_contact_id, full_name')
        .in('ghl_contact_id', contactIds)

      const nameMap = new Map((contacts ?? []).map(c => [c.ghl_contact_id, c.full_name ?? 'Unknown']))

      const brokerName = `${broker.first_name} ${broker.last_name}`

      // Send one email per alert (up to 5) to avoid overwhelming
      for (const alert of brokerAlerts.slice(0, 5)) {
        const { subject, html } = switchAlertEmail({
          brokerName,
          clientName: nameMap.get(alert.ghl_contact_id) ?? 'Unknown Client',
          carrier: alert.carrier ?? 'Unknown Carrier',
          alertType: alert.alert_type,
          dashboardUrl: `${APP_URL}/dashboard/churn`,
        })

        await getResend().emails.send({
          from: FROM_EMAIL,
          to: broker.email,
          subject,
          html,
        })
      }

      // If more than 5, send a summary
      if (brokerAlerts.length > 5) {
        const { subject, html } = switchAlertEmail({
          brokerName,
          clientName: `${brokerAlerts.length} clients`,
          carrier: brokerAlerts[0]?.carrier ?? 'Multiple Carriers',
          alertType: 'missing_from_roster',
          dashboardUrl: `${APP_URL}/dashboard/churn`,
        })
        await getResend().emails.send({ from: FROM_EMAIL, to: broker.email, subject, html })
      }
    }
  } catch (err) {
    console.error('[notifyNewSwitchAlerts]', err)
  }
}

// ── 2. VCC Deadlines ──────────────────────────────────────────────────────
// Called by the daily notifications cron — finds forms sending within 7 days

export async function notifyVCCDeadlines(): Promise<void> {
  try {
    const supabase = createServiceClient()
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data: upcoming } = await supabase
      .from('vcc_submissions')
      .select('id, agency_id, broker_id, client_name, carrier, send_scheduled_at')
      .eq('fax_status', 'scheduled')
      .gte('send_scheduled_at', now.toISOString())
      .lte('send_scheduled_at', in7Days.toISOString())

    if (!upcoming?.length) return

    for (const sub of upcoming) {
      if (!sub.broker_id) continue

      const { data: broker } = await supabase
        .from('brokers')
        .select('first_name, last_name, email')
        .eq('id', sub.broker_id)
        .maybeSingle()

      if (!broker?.email) continue

      const sendDate = new Date(sub.send_scheduled_at)
      const daysRemaining = Math.max(1, Math.ceil((sendDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

      const { subject, html } = vccDeadlineEmail({
        brokerName: `${broker.first_name} ${broker.last_name}`,
        clientName: sub.client_name,
        carrier: sub.carrier,
        daysRemaining,
        dashboardUrl: `${APP_URL}/dashboard/vcc`,
      })

      await getResend().emails.send({ from: FROM_EMAIL, to: broker.email, subject, html })
    }
  } catch (err) {
    console.error('[notifyVCCDeadlines]', err)
  }
}

// ── 3. AOR Signed ─────────────────────────────────────────────────────────
// Called after client signs AOR — notifies the assigned broker

export async function notifyAORSigned(submissionId: string): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { data: sub } = await supabase
      .from('aor_submissions')
      .select('broker_id, client_name, signature_method')
      .eq('id', submissionId)
      .maybeSingle()

    if (!sub?.broker_id) return

    const { data: broker } = await supabase
      .from('brokers')
      .select('first_name, last_name, email')
      .eq('id', sub.broker_id)
      .maybeSingle()

    if (!broker?.email) return

    const { subject, html } = aorSignedEmail({
      brokerName: `${broker.first_name} ${broker.last_name}`,
      clientName: sub.client_name,
      signatureMethod: sub.signature_method ?? 'email_link',
      dashboardUrl: `${APP_URL}/dashboard/aor`,
    })

    await getResend().emails.send({ from: FROM_EMAIL, to: broker.email, subject, html })
  } catch (err) {
    console.error('[notifyAORSigned]', err)
  }
}

// ── 4. Team Invite ────────────────────────────────────────────────────────
// Called after broker insert in /api/team/invite

export async function sendTeamInviteEmail(params: {
  inviteeEmail: string
  inviterName: string
  agencyName: string
  role: string
  inviteUrl: string
}): Promise<void> {
  try {
    const { subject, html } = teamInviteEmail({
      inviterName: params.inviterName,
      agencyName: params.agencyName,
      role: params.role,
      inviteUrl: params.inviteUrl,
      expiresIn: '7 days',
    })

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: params.inviteeEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error('[sendTeamInviteEmail]', err)
  }
}

// ── 5. Weekly Digests ─────────────────────────────────────────────────────
// Called every Monday by the notifications cron

export async function sendWeeklyDigests(): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Get all active agencies
    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name')

    if (!agencies?.length) return

    for (const agency of agencies) {
      // Get all brokers in agency with email
      const { data: brokers } = await supabase
        .from('brokers')
        .select('id, user_id, first_name, last_name, email, role')
        .eq('agency_id', agency.id)
        .not('email', 'is', null)

      if (!brokers?.length) continue

      // Agency-wide stats
      const [{ count: openAlerts }, { count: vccPending }, { count: aorPending }, { count: clientsAtRisk }] =
        await Promise.all([
          supabase.from('switch_alerts').select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id).eq('status', 'open'),
          supabase.from('vcc_submissions').select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id).eq('fax_status', 'scheduled'),
          supabase.from('aor_submissions').select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id).eq('status', 'client_signed'),
          supabase.from('ghl_contacts').select('id', { count: 'exact', head: true })
            .eq('agency_id', agency.id).in('risk_level', ['critical', 'high']),
        ])

      for (const broker of brokers) {
        const { subject, html } = weeklyDigestEmail({
          brokerName: `${broker.first_name} ${broker.last_name}`,
          agencyName: agency.name,
          openAlerts: openAlerts ?? 0,
          vccPending: vccPending ?? 0,
          aorPending: aorPending ?? 0,
          clientsAtRisk: clientsAtRisk ?? 0,
          dashboardUrl: `${APP_URL}/dashboard`,
        })

        await getResend().emails.send({ from: FROM_EMAIL, to: broker.email!, subject, html })
      }
    }
  } catch (err) {
    console.error('[sendWeeklyDigests]', err)
  }
}
