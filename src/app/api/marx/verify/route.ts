import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSwitchAlertEmail } from '@/lib/email/send-notifications'
import { withRetry, withRetrySafe } from '@/lib/utils/retry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.aegissage.com'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  console.log('[verify] START', JSON.stringify({
    marxResult: body.marxResult,
    mbi: body.mbi ? String(body.mbi).slice(0, 4) + '...' : null,
    memberId: body.memberId,
    detectedPlanCode: body.detectedPlanCode,
  }))

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()

  const { data: broker, error: brokerErr } = await db
    .from('brokers')
    .select('id, agency_id, user_id, email, first_name, last_name')
    .eq('extension_api_key', token)
    .single()

  if (!broker) {
    console.error('[verify] broker lookup failed:', JSON.stringify(brokerErr))
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  let notificationEmail: string | null = broker.email
  if (!notificationEmail && broker.user_id) {
    try {
      const { data: { user: authUser } } = await db.auth.admin.getUserById(broker.user_id)
      notificationEmail = authUser?.email ?? null
      if (notificationEmail) console.log('[verify] using auth email fallback for broker:', broker.id)
    } catch {}
  }

  console.log('[verify] broker:', broker.id, '| agency:', broker.agency_id)

  let member: any = null

  if (body.memberId && String(body.memberId).length === 36) {
    const { data, error } = await db
      .from('book_of_business')
      .select('id, agency_id, full_name, mbi, plan_id, plan_name, plan_contract, plan_pbp, carrier, last_known_plan_code, verification_status')
      .eq('id', body.memberId)
      .single()
    if (error) console.log('[verify] memberId lookup miss:', error.message)
    member = data ?? null
  }

  if (!member && body.mbi) {
    const cleanMbi = String(body.mbi).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
    const { data, error } = await db
      .from('book_of_business')
      .select('id, agency_id, full_name, mbi, plan_id, plan_name, plan_contract, plan_pbp, carrier, last_known_plan_code, verification_status')
      .eq('mbi', cleanMbi)
      .eq('agency_id', broker.agency_id)
      .single()
    if (error) console.log('[verify] mbi lookup miss:', error.message)
    member = data ?? null
  }

  if (!member) {
    console.error('[verify] member not found | memberId:', body.memberId, '| mbi prefix:', body.mbi ? String(body.mbi).slice(0, 4) : 'none')
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  console.log('[verify] member found:', member.full_name, '| agency:', member.agency_id, '| id:', member.id)

  const isValidPlanCode = (code: string | null): boolean =>
    code !== null && /^[HSE]\d{4}-\d{3}/.test(code)

  const marxResult          = String(body.marxResult ?? '')
  const detectedPlanCode    = (body.detectedPlanCode    as string | null) ?? null
  const detectedCarrier     = (body.detectedCarrier     as string | null) ?? null
  const detectedFuturePlan  = (body.detectedFuturePlan  as string | null) ?? null
  const detectedFutureStart = (body.detectedFutureStart as string | null) ?? null

  const storedCode     = member.last_known_plan_code || member.plan_id || null
  const storedContract = (
    member.plan_contract?.toUpperCase() ||
    storedCode?.match(/^([HRS]\d{4})/)?.[1]?.toUpperCase() ||
    member.plan_name?.match(/[HRS]\d{4}/)?.[0]?.toUpperCase() ||
    null
  )
  const storedPbp = (
    member.plan_pbp ||
    storedCode?.split('-')[1] ||
    member.plan_name?.match(/[-\s]\s*0*(\d{3})/)?.[1] ||
    null
  )
  const detectedContract = detectedPlanCode?.match(/^([HRS]\d{4})/)?.[1]?.toUpperCase() ?? null
  const detectedPbp      = detectedPlanCode?.split('-')[1] ?? null

  let realPlanName: string | null = null
  let realCarrierName: string | null = detectedCarrier
  let detectedPlanType: string | null = null

  if (detectedContract && detectedPbp) {
    const { data: planInfo } = await db
      .from('plan_pbp_directory')
      .select('plan_name, carrier_name, plan_type')
      .eq('contract', detectedContract)
      .eq('pbp', detectedPbp.padStart(3, '0'))
      .maybeSingle()
    if (planInfo) {
      realPlanName     = planInfo.plan_name
      realCarrierName  = planInfo.carrier_name
      detectedPlanType = planInfo.plan_type
      console.log('[verify] plan lookup:', detectedContract + '-' + detectedPbp, '->', realPlanName)
    } else {
      console.log('[verify] plan lookup: no match for', detectedContract + '-' + detectedPbp)
    }
  }

  console.log('[verify] comparison:', JSON.stringify({
    storedCode, storedContract, storedPbp,
    detectedPlanCode, detectedContract, detectedPbp,
    marxResult, realPlanName, realCarrierName,
  }))

  let finalStatus  = 'verified'
  let alertType: string | null = null
  let alertPriority = 'high'
  let effectiveMarxResult = marxResult

  if (marxResult === 'no_ma_plan') {
    finalStatus   = 'termed'
    alertType     = 'termed'
    alertPriority = 'critical'
  } else if (marxResult === 'pending_switch') {
    finalStatus   = 'pending_switch'
    alertType     = 'pending_switch'
    alertPriority = 'critical'
  } else if (marxResult === 'different_broker') {
    finalStatus   = 'aor_lost'
    alertType     = 'aor_change'
    alertPriority = 'critical'
  } else if (marxResult === 'not_found') {
    finalStatus = 'unverified'
    alertType   = null
  } else if (marxResult === 'active_same' || marxResult === 'active_changed') {
    if (!storedCode && !storedContract && isValidPlanCode(detectedPlanCode)) {
      console.log('[verify] setting baseline:', detectedPlanCode)
      const baselinePayload: Record<string, any> = {
        last_known_plan_code: detectedPlanCode,
        plan_id:              detectedPlanCode,
        carrier:              realCarrierName || detectedCarrier || member.carrier || null,
        verification_status:  'verified',
        last_verified_at:     new Date().toISOString(),
        last_marx_check:      new Date().toISOString(),
      }
      if (realPlanName)     baselinePayload.plan_name = realPlanName
      if (detectedPlanType) baselinePayload.plan_type = detectedPlanType

      const baselineResult = await withRetrySafe<void>(
        async () => {
          const res = await db.from('book_of_business').update(baselinePayload).eq('id', member.id)
          if (res.error) throw res.error
        },
        { maxAttempts: 3, baseDelayMs: 300, label: 'marx/verify baseline UPDATE' }
      )
      if (baselineResult.error) {
        console.error('[verify] baseline UPDATE failed after retries:', JSON.stringify(baselineResult.error))
      } else {
        console.log('[verify] baseline UPDATE OK')
      }
      return NextResponse.json({ changed: false, status: 'baseline_set' })
    }

    const contractChanged = !!(storedContract && detectedContract && storedContract !== detectedContract)
    const pbpChanged = !!(
      storedPbp && detectedPbp &&
      storedPbp.padStart(3, '0') !== detectedPbp.padStart(3, '0')
    )
    const carrierChanged = !!(
      detectedCarrier && member.carrier && member.carrier !== 'unknown' &&
      !detectedCarrier.toLowerCase().includes(member.carrier.toLowerCase()) &&
      !member.carrier.toLowerCase().includes(detectedCarrier.toLowerCase())
    )

    if (contractChanged || pbpChanged || carrierChanged) {
      effectiveMarxResult = 'active_changed'
      finalStatus   = 'changed'
      alertType     = carrierChanged ? 'carrier_switch' : 'plan_switch'
      alertPriority = 'high'
    }
  }

  // STEP 1: Update member status (with retry)
  const updatePayload: Record<string, any> = {
    verification_status: finalStatus,
    last_verified_at:    new Date().toISOString(),
    last_marx_check:     new Date().toISOString(),
  }
  if (isValidPlanCode(detectedPlanCode)) updatePayload.last_known_plan_code = detectedPlanCode
  if (realPlanName)     updatePayload.plan_name = realPlanName
  if (realCarrierName)  updatePayload.carrier   = realCarrierName
  if (detectedPlanType) updatePayload.plan_type = detectedPlanType
  if (finalStatus === 'termed')                              updatePayload.enrollment_status = 'disenrolled'
  if (finalStatus === 'verified' || finalStatus === 'changed') updatePayload.enrollment_status = 'active'

  const capturedName = typeof body.capturedName === 'string' ? body.capturedName.trim() : null
  if (capturedName && capturedName.length > 2) {
    const currentName = member.full_name || ''
    const looksPartial = !currentName || currentName === member.mbi || currentName.split(' ').length < 2
    if (looksPartial) {
      updatePayload.full_name = capturedName
      console.log('[verify] backfilling full_name from MARx capture:', capturedName)
    }
  }

  console.log('[verify] updating to:', finalStatus, '| member.id:', member.id)
  const memberUpdateResult = await withRetrySafe<void>(
    async () => {
      const res = await db.from('book_of_business').update(updatePayload).eq('id', member.id)
      if (res.error) throw res.error
    },
    { maxAttempts: 3, baseDelayMs: 300, label: 'marx/verify UPDATE member' }
  )

  if (memberUpdateResult.error) {
    console.error('[verify] UPDATE FAILED after retries:', JSON.stringify(memberUpdateResult.error))
    await withRetrySafe<void>(
      async () => {
        const res = await db.from('book_of_business')
          .update({ needs_reverification: true })
          .eq('id', member.id)
        if (res.error) throw res.error
      },
      { maxAttempts: 2, baseDelayMs: 200, label: 'marx/verify flag needs_reverification' }
    )
  } else {
    console.log('[verify] UPDATE OK | member:', member.full_name)
  }

  // STEP 2: Insert alert if needed (with retry)
  if (alertType) {
    const existingResult = await withRetrySafe<{ id: string } | null>(
      async () => {
        const res = await db.from('switch_alerts')
          .select('id')
          .eq('bob_member_id', member.id)
          .eq('alert_type', alertType)
          .eq('status', 'open')
          .maybeSingle()
        if (res.error) throw res.error
        return res.data as { id: string } | null
      },
      { maxAttempts: 3, baseDelayMs: 200, label: 'marx/verify check existing alert' }
    )
    const existing = existingResult.data

    if (!existing) {
      let effectiveDate: string | null = null
      if (detectedFutureStart) {
        try { effectiveDate = new Date(detectedFutureStart).toISOString().split('T')[0] } catch {}
      }

      const alertPayload = {
        agency_id:        member.agency_id,
        bob_member_id:    member.id,
        alert_type:       alertType,
        switch_type:      alertType,
        previous_value:   member.plan_name || storedCode || 'unknown',
        new_value:        marxResult === 'no_ma_plan'
                          ? 'no_active_ma_plan'
                          : marxResult === 'pending_switch'
                            ? (detectedFuturePlan || 'pending')
                            : realPlanName || detectedPlanCode || 'unknown',
        priority:         alertPriority,
        status:           'open',
        detection_source: 'marx_extension',
        carrier:          member.carrier || null,
        effective_date:   effectiveDate,
        detected_at:      new Date().toISOString(),
      }

      console.log('[verify] inserting alert:', JSON.stringify(alertPayload))
      const insertResult = await withRetrySafe<{ id: string }>(
        async () => {
          const res = await db.from('switch_alerts').insert(alertPayload).select('id').single()
          if (res.error) throw res.error
          return res.data as { id: string }
        },
        { maxAttempts: 3, baseDelayMs: 300, label: 'marx/verify INSERT alert' }
      )
      const inserted  = insertResult.data
      const insertErr = insertResult.error

      if (insertErr) {
        console.error('[verify] INSERT FAILED after retries:', JSON.stringify(insertErr))
      } else {
        console.log('[verify] INSERT OK | alert id:', inserted?.id)

        // STEP 3: Email AFTER successful DB write
        if (notificationEmail) {
          try {
            await withRetry(
              () => sendSwitchAlertEmail(notificationEmail!, {
                memberName:          member.full_name ?? 'Unknown Member',
                carrier:             member.carrier   ?? 'Unknown Carrier',
                switchType:          marxResult === 'no_ma_plan'
                                     ? 'termed'
                                     : marxResult === 'pending_switch'
                                       ? 'future_plan_change'
                                       : alertType === 'carrier_switch'
                                         ? 'carrier_switch'
                                         : 'plan_change',
                planCode:            detectedPlanCode ?? detectedFuturePlan ?? 'none',
                previousPlanCode:    storedCode ?? '',
                planName:            member.plan_name ?? '',
                futurePlanName:      detectedFuturePlan ?? undefined,
                futureEffectiveDate: detectedFutureStart ?? undefined,
                detectedVia:         'MARx (CMS Portal)',
                alertUrl:            `${APP_URL}/dashboard/alerts`,
              }),
              { maxAttempts: 2, baseDelayMs: 500, label: 'marx/verify send alert email' }
            )
            console.log('[verify] email sent to:', notificationEmail)

            if (inserted?.id) {
              const alertId = inserted.id
              await withRetrySafe<void>(
                async () => {
                  const res = await db.from('alert_delivery_log').insert({
                    alert_id:         alertId,
                    delivery_status:  'sent',
                    delivery_channel: 'email',
                    recipient_email:  notificationEmail,
                    attempted_at:     new Date().toISOString(),
                  })
                  if (res.error) throw res.error
                },
                { maxAttempts: 2, baseDelayMs: 200, label: 'marx/verify log delivery sent' }
              )
            }
          } catch (emailErr: any) {
            console.error('[verify] email error (non-fatal):', emailErr?.message)
            if (inserted?.id) {
              const alertId = inserted.id
              await withRetrySafe<void>(
                async () => {
                  const res = await db.from('alert_delivery_log').insert({
                    alert_id:         alertId,
                    delivery_status:  'failed',
                    delivery_channel: 'email',
                    recipient_email:  notificationEmail,
                    error_message:    emailErr?.message ?? 'Unknown email error',
                    attempted_at:     new Date().toISOString(),
                  })
                  if (res.error) throw res.error
                },
                { maxAttempts: 2, baseDelayMs: 200, label: 'marx/verify log delivery failed' }
              )
            }
          }
        }
      }
    } else {
      console.log('[verify] alert already open:', existing.id, '| skipping insert')
    }
  }

  console.log('[verify] DONE | member:', member.full_name, '| status:', finalStatus, '| alert:', alertType ?? 'none')
  return NextResponse.json({
    changed:    alertType !== null,
    marxResult: effectiveMarxResult,
    status:     finalStatus,
  })
}
