/**
 * POST /api/vcc/fax-status
 *
 * SRFax delivery status webhook receiver.
 *
 * SRFax fires this endpoint with a form-encoded POST payload when a queued
 * fax transitions to a terminal state (Success, Failed, No Answer, Busy).
 *
 * SRFax callback fields (form-encoded):
 *   sFaxDetailsID  — the queue ID returned from Queue_Fax (our fax_confirmation_id)
 *   sStatus        — 'Success' | 'Failed' | 'No Answer' | 'Busy'
 *   sPages         — number of pages transmitted
 *   sRemoteID      — remote station identifier (CSID)
 *   sScheduledDate — ISO date when the fax was dispatched
 *
 * Security:
 *   SRFax does not sign webhook payloads with an HMAC. We validate via a
 *   shared secret appended as a query param when registering the callback URL
 *   in SRFax account settings.
 *   Register your callback URL as:
 *     https://www.aegissage.com/api/vcc/fax-status?secret=<SRFAX_WEBHOOK_SECRET>
 *
 * Retry policy:
 *   On failure, if fax_attempts < MAX_FAX_RETRIES we immediately re-queue the
 *   fax via the SRFax API and increment the counter. On final failure we mark
 *   the submission as 'failed' so the broker sees it in their dashboard.
 *
 * Idempotency:
 *   SRFax may fire the callback more than once for the same event. The update
 *   is guarded by checking the current fax_status — if it is already 'signed'
 *   or 'failed' (final states), we return 200 without re-processing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendFax } from '@/lib/vcc/fax-dispatcher'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FAX_RETRIES = 3

// ── Shared secret validation ──────────────────────────────────────────────────

function validateWebhookSecret(req: NextRequest): boolean {
  const expected = process.env.SRFAX_WEBHOOK_SECRET
  if (!expected) {
    // Secret not configured — block in production, allow in development
    if (process.env.NODE_ENV === 'production') {
      console.error('[fax-status] SRFAX_WEBHOOK_SECRET not set — rejecting webhook')
      return false
    }
    console.warn('[fax-status] SRFAX_WEBHOOK_SECRET not set — accepting in dev mode')
    return true
  }
  const provided = req.nextUrl.searchParams.get('secret')
  return provided === expected
}

// ── SRFax status → our fax_status mapping ────────────────────────────────────

function mapSrFaxStatus(srfaxStatus: string): 'sent' | 'failed' {
  return srfaxStatus.toLowerCase() === 'success' ? 'sent' : 'failed'
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!validateWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SRFax sends application/x-www-form-urlencoded
  let body: Record<string, string>
  try {
    const text = await req.text()
    body = Object.fromEntries(new URLSearchParams(text))
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const faxQueueId = body.sFaxDetailsID?.trim()
  const srfaxStatus = body.sStatus?.trim()

  if (!faxQueueId || !srfaxStatus) {
    console.warn('[fax-status] missing sFaxDetailsID or sStatus in payload:', body)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  console.log('[fax-status] received', { faxQueueId, srfaxStatus })

  const svc = createServiceClient()

  // ── Fetch the matching submission ─────────────────────────────────────────
  const { data: submission, error: fetchErr } = await svc
    .from('vcc_submissions')
    .select('id, agency_id, fax_status, fax_attempts, fax_confirmation_id, doctor_fax, filled_pdf_path, carrier, client_name')
    .eq('fax_confirmation_id', faxQueueId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[fax-status] DB fetch error:', fetchErr.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!submission) {
    // Unrecognised queue ID — SRFax may be firing for a fax sent outside the app
    console.warn('[fax-status] no submission found for fax_confirmation_id:', faxQueueId)
    return NextResponse.json({ ok: true, note: 'unrecognised_fax_id' })
  }

  // ── Idempotency guard: skip if already in a terminal state ────────────────
  const TERMINAL_STATUSES = new Set(['signed', 'failed', 'expired'])
  if (TERMINAL_STATUSES.has(submission.fax_status ?? '')) {
    console.log('[fax-status] submission already in terminal state — skipping', submission.id)
    return NextResponse.json({ ok: true, note: 'already_terminal' })
  }

  const resolvedStatus = mapSrFaxStatus(srfaxStatus)
  const attempts = (submission.fax_attempts as number | null) ?? 0

  // ── Success path ──────────────────────────────────────────────────────────
  if (resolvedStatus === 'sent') {
    await svc
      .from('vcc_submissions')
      .update({
        fax_status:  'sent',
        fax_sent_at: new Date().toISOString(),
      })
      .eq('id', submission.id)

    // Compliance audit
    await svc.from('audit_log').insert({
      agency_id:     submission.agency_id,
      user_id:       null,                 // system event, no user context
      action:        'FAX_DELIVERED',
      resource_type: 'vcc_submissions',
      resource_id:   submission.id,
      metadata: {
        fax_queue_id: faxQueueId,
        srfax_status: srfaxStatus,
        pages:        body.sPages ?? null,
      },
    }).then(() => {})

    console.log('[fax-status] fax delivered for submission', submission.id)
    return NextResponse.json({ ok: true, status: 'sent' })
  }

  // ── Failure path ──────────────────────────────────────────────────────────
  const newAttemptCount = attempts + 1
  const canRetry = newAttemptCount < MAX_FAX_RETRIES
    && !!submission.doctor_fax
    && !!submission.filled_pdf_path

  if (canRetry) {
    // Re-queue the fax immediately with an incremented attempt counter
    try {
      const { data: fileBlob } = await svc.storage
        .from('VCC-filled')
        .download(submission.filled_pdf_path!)

      let newConfirmationId: string | null = null

      if (fileBlob) {
        const buf = await fileBlob.arrayBuffer()
        const retryResult = await sendFax(
          new Uint8Array(buf),
          submission.doctor_fax!,
          `VCC Form (Retry ${newAttemptCount}/${MAX_FAX_RETRIES}) — ${submission.carrier ?? 'Unknown'} — ${submission.client_name ?? ''}`.trim()
        )
        newConfirmationId = retryResult.confirmationId ?? null

        await svc
          .from('vcc_submissions')
          .update({
            fax_status:          'pending',
            fax_attempts:        newAttemptCount,
            fax_confirmation_id: newConfirmationId ?? submission.fax_confirmation_id,
            fax_last_error:      `Retry ${newAttemptCount}: SRFax status=${srfaxStatus}`,
          })
          .eq('id', submission.id)

        console.log('[fax-status] retry queued for', submission.id, 'attempt', newAttemptCount)
      }
    } catch (retryErr: unknown) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error('[fax-status] retry failed for', submission.id, msg)
      // Fall through to final failure below
    }
  } else {
    // Final failure — exhausted retries or no PDF on file
    await svc
      .from('vcc_submissions')
      .update({
        fax_status:     'failed',
        fax_attempts:   newAttemptCount,
        fax_last_error: `Final failure after ${newAttemptCount} attempt(s): SRFax status=${srfaxStatus}`,
      })
      .eq('id', submission.id)

    // Compliance audit
    await svc.from('audit_log').insert({
      agency_id:     submission.agency_id,
      user_id:       null,
      action:        'FAX_FAILED_FINAL',
      resource_type: 'vcc_submissions',
      resource_id:   submission.id,
      metadata: {
        fax_queue_id:  faxQueueId,
        srfax_status:  srfaxStatus,
        attempts:      newAttemptCount,
        doctor_fax:    submission.doctor_fax,
      },
    }).then(() => {})

    console.warn('[fax-status] final fax failure for submission', submission.id, 'after', newAttemptCount, 'attempts')
  }

  return NextResponse.json({ ok: true, status: resolvedStatus, attempts: newAttemptCount })
}
