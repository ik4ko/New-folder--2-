import { getResend, FROM_EMAIL } from './resend-client'
import {
  switchAlertEmail, vccDeadlineEmail, aorSignedEmail,
  teamInviteEmail, weeklyDigestEmail,
} from './templates'
import { createServiceClient } from '@/lib/supabase/service'
import { withRetry, withRetrySafe } from '@/lib/utils/retry'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.aegissage.com'

// -- 1. Switch Alerts -------------------------------------------------------
// Called after extension sync detects missing members -- fires per-switch emails

export async function notifyNewSwitchAlerts(uploadId: string, agencyId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY?.startsWith('re_')) return

  try {
    const supabase = createServiceClient()

    const { data: alerts } = await supabase
      .from('switch_alerts')
      .select('id, broker_id, bob_member_id, ghl_contact_id, carrier, alert_type')
      .eq('upload_id', uploadId)
      .eq('agency_id', agencyId)
      .eq('alert_type', 'missing_from_roster')
      .eq('status', 'open')

    if (!alerts?.length) return

    // Batch-fetch member names from book_of_business
    const bobIds = [...new Set(alerts.map(a => a.bob_member_id).filter(Boolean))] as string[]
    const { data: bobMembers } = await supabase
      .from('book_of_business')
      .select('id, full_name')
      .in('id', bobIds)

    const bobNameMap = new Map((bobMembers ?? []).map(m => [m.id, m.full_name ?? 'Unknown']))

    // Fall back to ghl_contacts for legacy alerts
    const legacyContactIds = alerts
      .filter(a => !a.bob_member_id)
      .map(a => a.ghl_contact_id)
      .filter(Boolean)
    let ghlNameMap = new Map<string, string>()
    if (legacyContactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_contact_id, full_name')
        .in('ghl_contact_id', legacyContactIds)
      ghlNameMap = new Map((contacts ?? []).map(c => [c.ghl_contact_id, c.full_name ?? 'Unknown']))
    }

    const getClientName = (a: typeof alerts[0]) =>
      (a.bob_member_id && bobNameMap.get(a.bob_member_id)) ||
      (a.ghl_contact_id && ghlNameMap.get(a.ghl_contact_id)) ||
      'Unknown Client'

    // Group by broker_id
    const byBroker = new Map<string, typeof alerts>()
    for (const a of alerts) {
      if (!a.broker_id) continue
      if (!byBroker.has(a.broker_id)) byBroker.set(a.broker_id, [])
      byBroker.get(a.broker_id)!.push(a)
    }

    // Process each broker independently -- one failure must not block others
    await Promise.allSettled(
      Array.from(byBroker.entries()).map(async ([brokerId, brokerAlerts]) => {
        try {
          const { data: broker } = await supabase
            .from('brokers')
            .select('first_name, last_name, email')
            .eq('id', brokerId)
            .maybeSingle()

          if (!broker?.email) return

          const brokerName = `${broker.first_name} ${broker.last_name}`

          // Send one immediate email per alert (up to 5), each isolated
          await Promise.allSettled(
            brokerAlerts.slice(0, 5).map(async alert => {
              try {
                const clientName = getClientName(alert)
                const { subject, html } = switchAlertEmail({
                  brokerName,
                  clientName,
                  carrier: alert.carrier ?? 'Unknown Carrier',
                  alertType: alert.alert_type,
                  dashboardUrl: `${APP_URL}/dashboard/alerts`,
                })
                await withRetry(
                  () => getResend().emails.send({ from: FROM_EMAIL, to: broker.email!, subject, html }),
                  { maxAttempts: 2, baseDelayMs: 400, label: `notifyNewSwitchAlerts alert=${alert.id}` }
                )
              } catch (alertErr) {
                console.error(`[notifyNewSwitchAlerts] email failed for alert ${alert.id}:`, alertErr)
              }
            })
          )

          // Summary email if more than 5 alerts
          if (brokerAlerts.length > 5) {
            try {
              const { subject, html } = switchAlertEmail({
                brokerName,
                clientName: `${brokerAlerts.length} clients`,
                carrier: brokerAlerts[0]?.carrier ?? 'Multiple Carriers',
                alertType: 'missing_from_roster',
                dashboardUrl: `${APP_URL}/dashboard/alerts`,
              })
              await withRetry(
                () => getResend().emails.send({ from: FROM_EMAIL, to: broker.email!, subject, html }),
                { maxAttempts: 2, baseDelayMs: 400, label: `notifyNewSwitchAlerts summary broker=${brokerId}` }
              )
            } catch (summaryErr) {
              console.error(`[notifyNewSwitchAlerts] summary email failed for broker ${brokerId}:`, summaryErr)
            }
          }
        } catch (brokerErr) {
          console.error(`[notifyNewSwitchAlerts] broker ${brokerId} processing failed:`, brokerErr)
        }
      })
    )
  } catch (err) {
    console.error('[notifyNewSwitchAlerts]', err)
  }
}

// -- 2. VCC Deadlines -------------------------------------------------------
// Called by the daily notifications cron -- finds forms sending within 7 days

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

// -- 3. AOR Signed ----------------------------------------------------------
// Called after client signs AOR -- notifies the assigned broker

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

// -- 4. Team Invite ---------------------------------------------------------
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

// -- 5b. MARx Switch Alert (immediate, per-client) --------------------------
// Called by /api/marx/verify when a change is confirmed via CMS MARx lookup.

export async function sendSwitchAlertEmail(
  toEmail: string,
  data: {
    memberName: string
    carrier: string
    switchType: string
    planCode: string
    previousPlanCode: string
    planName: string
    futurePlanName?: string
    futureEffectiveDate?: string
    endDate?: string
    detectedVia: string
    alertUrl: string
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY?.startsWith('re_')) {
    console.warn('[email] Resend key not configured -- skipping MARx alert email')
    return
  }

  let subject: string
  let body: string

  if (data.switchType === 'future_plan_change') {
    subject = `ACTION REQUIRED -- ${data.memberName} switching plans ${data.futureEffectiveDate}`
    body = `AegisSage detected an upcoming plan change for one of your clients.

Client: ${data.memberName}
Current: ${data.previousPlanCode}
Incoming: ${data.futurePlanName ?? data.planCode}
Effective Date: ${data.futureEffectiveDate}
Carrier: ${data.carrier}
Detected via: ${data.detectedVia}

${data.memberName} has an upcoming plan change effective ${data.futureEffectiveDate}. You still have time to reach out.

View alert and take action:
${data.alertUrl}`
  } else if (data.switchType === 'termed') {
    subject = `ALERT: ${data.memberName} has left Medicare Advantage`
    body = `AegisSage detected that a client no longer has an active Medicare Advantage plan.

Client: ${data.memberName}
Previous Plan: ${data.previousPlanCode}
Carrier: ${data.carrier}
Detected via: ${data.detectedVia}

${data.memberName} no longer has an active Medicare Advantage plan as of today. They may have disenrolled, switched to Original Medicare, or passed away.

View alert and take action:
${data.alertUrl}`
  } else {
    subject = `WARNING: ${data.memberName} -- Plan Change Detected`
    body = `AegisSage detected a plan change for one of your clients.

Client: ${data.memberName}
Previous: ${data.previousPlanCode}
New: ${data.planCode}
Carrier: ${data.carrier}
Detected via: ${data.detectedVia}

${data.memberName} has switched plans. They are still on Medicare Advantage.

View alert and take action:
${data.alertUrl}`
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      text: body,
    })
  } catch (err) {
    console.error('[sendSwitchAlertEmail]', err)
    throw err  // re-throw so callers can retry or log delivery failure
  }
}

// -- 5a. Open Alert Notifications -------------------------------------------
// Called every cron run -- finds open alerts with no notified_at, groups by
// broker, sends one summary email per broker, then stamps notified_at ONLY on
// successful sends. Failed brokers remain unnotified for next cron retry.

export async function notifyOpenAlerts(): Promise<void> {
  if (!process.env.RESEND_API_KEY?.startsWith('re_')) return

  try {
    const supabase = createServiceClient()

    const { data: alerts } = await supabase
      .from('switch_alerts')
      .select('id, agency_id, broker_id, bob_member_id, alert_type, switch_type, carrier, previous_plan_code, new_plan_code, previous_value, new_value')
      .eq('status', 'open')
      .is('notified_at', null)

    if (!alerts?.length) return

    const bobIds = [...new Set(alerts.map(a => a.bob_member_id).filter(Boolean))] as string[]
    const { data: bobMembers } = await supabase
      .from('book_of_business')
      .select('id, full_name')
      .in('id', bobIds)
    const nameMap = new Map((bobMembers ?? []).map(m => [m.id, m.full_name ?? 'Unknown']))

    const byBroker = new Map<string, typeof alerts>()
    for (const a of alerts) {
      if (!a.broker_id) continue
      if (!byBroker.has(a.broker_id)) byBroker.set(a.broker_id, [])
      byBroker.get(a.broker_id)!.push(a)
    }

    const now = new Date().toISOString()

    // Process each broker independently -- one failure must not block others
    const brokerResults = await Promise.allSettled(
      Array.from(byBroker.entries()).map(async ([brokerId, brokerAlerts]) => {
        const { data: broker } = await supabase
          .from('brokers')
          .select('first_name, last_name, email')
          .eq('id', brokerId)
          .maybeSingle()

        if (!broker?.email) return { brokerId, skipped: true, reason: 'no email' }

        const alertLines = brokerAlerts.map(a => {
          const name = nameMap.get(a.bob_member_id ?? '') ?? 'Unknown Client'
          const prev = a.previous_plan_code ?? a.previous_value ?? 'Unknown'
          const next = a.new_plan_code ?? a.new_value ?? 'Unknown'
          const carrier = a.carrier ?? 'Unknown'
          if (a.alert_type === 'termed' || a.switch_type === 'termed') {
            return `- ${name} -- No longer on Medicare Advantage (was: ${carrier} ${prev})`
          }
          if (a.alert_type === 'aor_change') {
            return `- ${name} -- AOR change detected (may have switched brokers) -- ${carrier}`
          }
          return `- ${name} -- Plan switch: ${prev} -> ${next} (${carrier})`
        }).join('\n')

        const count = brokerAlerts.length
        const subject = `AegisSage -- ${count} client${count > 1 ? 's' : ''} need${count === 1 ? 's' : ''} attention`
        const html = `<p>Hi ${broker.first_name},</p>
<p>AegisSage detected the following changes in your book of business:</p>
<pre style="font-family:monospace;background:#f4f4f4;padding:16px;border-radius:8px;white-space:pre-wrap">${alertLines}</pre>
<p><a href="${APP_URL}/dashboard/alerts" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">View All Alerts</a></p>
<p style="color:#888;font-size:12px">AegisSage Medicare Retention Platform</p>`

        const alertIds = brokerAlerts.map(a => a.id)
        let emailSent = false
        let emailError: string | null = null

        try {
          await withRetry(
            () => getResend().emails.send({ from: FROM_EMAIL, to: broker.email!, subject, html }),
            { maxAttempts: 3, baseDelayMs: 500, label: `notifyOpenAlerts broker=${brokerId}` }
          )
          emailSent = true
        } catch (sendErr) {
          emailError = sendErr instanceof Error ? sendErr.message : String(sendErr)
          console.error(`[notifyOpenAlerts] email failed for broker ${brokerId}:`, emailError)
        }

        // Stamp notified_at ONLY on successful send -- failed alerts stay unnotified for retry
        if (emailSent) {
          await withRetrySafe<void>(
            async () => {
              const res = await supabase
                .from('switch_alerts')
                .update({ notified_at: now, notification_email: broker.email })
                .in('id', alertIds)
              if (res.error) throw res.error
            },
            { maxAttempts: 3, baseDelayMs: 200, label: 'notifyOpenAlerts stamp notified_at' }
          )
        }

        // Write delivery log for every alert in this batch
        const deliveryLogs = alertIds.map(alertId => ({
          alert_id:         alertId,
          delivery_status:  emailSent ? 'sent' : 'failed',
          delivery_channel: 'email',
          recipient_email:  broker.email,
          error_message:    emailError,
          attempted_at:     now,
        }))
        await withRetrySafe<void>(
          async () => {
            const res = await supabase.from('alert_delivery_log').insert(deliveryLogs)
            if (res.error) throw res.error
          },
          { maxAttempts: 2, baseDelayMs: 200, label: 'notifyOpenAlerts delivery log' }
        )

        return { brokerId, sent: emailSent, alertCount: brokerAlerts.length, error: emailError }
      })
    )

    const failCount = brokerResults.filter(r =>
      r.status === 'rejected' ||
      (r.status === 'fulfilled' && r.value && !(r.value as any).skipped && !(r.value as any).sent)
    ).length
    if (failCount > 0) {
      console.error(`[notifyOpenAlerts] ${failCount} broker(s) had delivery failures -- will retry next cron run`)
    }
  } catch (err) {
    console.error('[notifyOpenAlerts]', err)
  }
}

// -- 5. Weekly Digests ------------------------------------------------------
// Called every Monday by the notifications cron

export async function sendWeeklyDigests(): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { data: agencies } = await supabase
      .from('agencies')
      .select('id, name')

    if (!agencies?.length) return

    for (const agency of agencies) {
      const { data: brokers } = await supabase
        .from('brokers')
        .select('id, user_id, first_name, last_name, email, role')
        .eq('agency_id', agency.id)
        .not('email', 'is', null)

      if (!brokers?.length) continue

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

      // Each broker digest is isolated -- one send failure won't block the rest
      await Promise.allSettled(
        brokers.map(async broker => {
          try {
            const { subject, html } = weeklyDigestEmail({
              brokerName: `${broker.first_name} ${broker.last_name}`,
              agencyName: agency.name,
              openAlerts: openAlerts ?? 0,
              vccPending: vccPending ?? 0,
              aorPending: aorPending ?? 0,
              clientsAtRisk: clientsAtRisk ?? 0,
              dashboardUrl: `${APP_URL}/dashboard`,
            })
            await withRetry(
              () => getResend().emails.send({ from: FROM_EMAIL, to: broker.email!, subject, html }),
              { maxAttempts: 2, baseDelayMs: 500, label: `sendWeeklyDigests broker=${broker.id}` }
            )
          } catch (brokerErr) {
            console.error(`[sendWeeklyDigests] email failed for broker ${broker.id}:`, brokerErr)
          }
        })
      )
    }
  } catch (err) {
    console.error('[sendWeeklyDigests]', err)
  }
}
