'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendFax } from '@/lib/vcc/fax-dispatcher'
import { ghlFetch } from '@/lib/campaigns/ghl-client'
import { addGHLTag, createGHLTask } from '@/lib/campaigns/ghl-workflow'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createHash, randomBytes } from 'crypto'
import { Resend } from 'resend'
import { notifyAORSigned } from '@/lib/email/send-notifications'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// -- Types -----------------------------------------------------------------

export type SignatureMethod = 'email_link' | 'sms_link' | 'manual_upload' | 'in_person' | 'docusign'

export interface AORSubmission {
  id: string
  agency_id: string
  ghl_contact_id: string
  broker_id: string
  client_name: string
  medicare_id_hash: string | null
  client_email: string | null
  client_phone: string | null
  broker_name: string
  broker_npn: string | null
  broker_address: string | null
  carrier: string
  carrier_fax: string | null
  filled_pdf_path: string | null
  status: 'prepared' | 'client_sent' | 'client_signed' | 'broker_signed' | 'faxed' | 'confirmed' | 'expired' | 'rejected'
  signature_method: SignatureMethod
  client_signature_token: string | null
  client_signature_token_expires_at: string | null
  client_signed_at: string | null
  client_signature_name: string | null
  broker_signed_at: string | null
  broker_signature_name: string | null
  fax_confirmation_id: string | null
  fax_sent_at: string | null
  fax_status: 'pending' | 'sent' | 'failed' | 'confirmed'
  confirmation_pdf_path: string | null
  notes: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

// -- Helpers ---------------------------------------------------------------

function hashMedicareId(raw: string): string {
  const normalized = raw.replace(/[\s-]/g, '').toUpperCase()
  return createHash('sha256').update(normalized).digest('hex')
}

async function fillAORPDF(data: {
  client_name: string
  medicare_id?: string
  broker_name: string
  broker_npn?: string
  broker_address?: string
  submission_date?: string
}): Promise<Uint8Array> {
  const supabase = createServiceClient()
  const date = data.submission_date ?? new Date().toLocaleDateString('en-US')

  const fieldData: Record<string, string> = {
    client_name: data.client_name,
    medicare_id: data.medicare_id ?? '',
    broker_name: data.broker_name,
    broker_npn: data.broker_npn ?? '',
    broker_address: data.broker_address ?? '',
    scope_of_appointment: 'Medicare health plan enrollment, disenrollment, and benefits assistance',
    submission_date: date,
  }

  const fieldMap: Record<string, { page: number; x: number; y: number; size: number }> = {
    client_name:          { page: 1, x: 180, y: 620, size: 11 },
    medicare_id:          { page: 1, x: 180, y: 598, size: 11 },
    broker_name:          { page: 1, x: 180, y: 545, size: 11 },
    broker_npn:           { page: 1, x: 180, y: 523, size: 11 },
    broker_address:       { page: 1, x: 180, y: 501, size: 10 },
    scope_of_appointment: { page: 1, x:  60, y: 465, size: 10 },
    submission_date:      { page: 1, x: 400, y: 620, size: 11 },
  }

  const { data: fileData, error } = await supabase.storage
    .from('aor-templates')
    .download('cms_1696_2026.pdf')

  let pdfDoc: PDFDocument

  if (error || !fileData) {
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const body = await pdfDoc.embedFont(StandardFonts.Helvetica)

    page.drawText('CMS-1696 Appointment of Representative', { x: 50, y: 740, size: 14, font: bold, color: rgb(0, 0, 0) })
    page.drawText(`Generated: ${date}`, { x: 50, y: 720, size: 9, font: body, color: rgb(0.4, 0.4, 0.4) })

    const rows: [string, string][] = [
      ['Client Name', fieldData.client_name],
      ['Medicare ID (hashed)', '*** protected ***'],
      ['Broker Name', fieldData.broker_name],
      ['Broker NPN', fieldData.broker_npn],
      ['Broker Address', fieldData.broker_address],
      ['Scope', fieldData.scope_of_appointment],
    ]
    let y = 680
    for (const [label, value] of rows) {
      if (!value) continue
      page.drawText(`${label}:`, { x: 50, y, size: 9, font: bold, color: rgb(0, 0, 0) })
      page.drawText(value, { x: 180, y, size: 9, font: body, color: rgb(0, 0, 0) })
      y -= 22
    }

    y -= 20
    page.drawLine({ start: { x: 50, y }, end: { x: 280, y }, thickness: 0.5, color: rgb(0, 0, 0) })
    page.drawText('Client Signature', { x: 50, y: y - 14, size: 8, font: body, color: rgb(0.4, 0.4, 0.4) })
    page.drawLine({ start: { x: 320, y }, end: { x: 550, y }, thickness: 0.5, color: rgb(0, 0, 0) })
    page.drawText('Representative Signature', { x: 320, y: y - 14, size: 8, font: body, color: rgb(0.4, 0.4, 0.4) })

    return pdfDoc.save()
  }

  const buf = await fileData.arrayBuffer()
  pdfDoc = await PDFDocument.load(buf)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const [key, pos] of Object.entries(fieldMap)) {
    const value = fieldData[key]
    if (!value) continue
    const pg = pages[pos.page - 1]
    if (!pg) continue
    pg.drawText(value, { x: pos.x, y: pos.y, size: pos.size, font, color: rgb(0, 0, 0) })
  }

  return pdfDoc.save()
}

async function addSignatureToPDF(pdfBytes: Uint8Array, signerName: string, role: 'client' | 'broker'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const page = pages[0]
  const { height } = page.getSize()

  const y = role === 'client' ? 120 : 80
  const x = role === 'client' ? 50 : 320

  page.drawText(`/s/ ${signerName}`, { x, y: height - y, size: 12, font, color: rgb(0, 0.3, 0.7) })
  page.drawText(new Date().toLocaleDateString('en-US'), { x, y: height - y - 18, size: 9, font, color: rgb(0.4, 0.4, 0.4) })

  return pdfDoc.save()
}

async function saveToPHIVault(pdfBytes: Uint8Array, path: string): Promise<string> {
  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('phi-vault')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`PHI vault save failed: ${error.message}`)
  return path
}

async function sendGHLSMS(agencyId: string, ghlContactId: string, message: string): Promise<void> {
  await ghlFetch(agencyId, '/conversations/messages', {
    method: 'POST',
    body: JSON.stringify({ type: 'SMS', contactId: ghlContactId, message }),
  })
}

async function sendSignatureEmail(to: string, clientName: string, brokerName: string, signUrl: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'AegisSage <noreply@aegissage.com>',
    to,
    subject: `Action Required: Sign Your Medicare AOR -- ${brokerName}`,
    html: `
      <p>Hi ${clientName},</p>
      <p>Your broker <strong>${brokerName}</strong> has prepared your
      Medicare Appointment of Representative (CMS-1696) form.</p>
      <p>Please click below to review and sign:</p>
      <p><a href="${signUrl}" style="background:#0D9488;color:#fff;padding:12px 24px;
        border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Review &amp; Sign Document
      </a></p>
      <p style="color:#888;font-size:12px;">Link expires in 72 hours. If you have questions,
      contact ${brokerName} directly.</p>
    `,
  })
}

// -- 1. Create AOR Submission ----------------------------------------------

export async function createAORSubmission(input: {
  ghlContactId: string
  clientName: string
  medicareId?: string
  clientEmail?: string
  clientPhone?: string
  carrier: string
  carrierFax?: string
  signatureMethod?: SignatureMethod
}): Promise<{ submissionId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const { data: agencyRow } = await supabase
    .from('agencies')
    .select('id, subscription_tier, is_beta')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { data: brokerRow } = await supabase
    .from('brokers')
    .select('id, agency_id, npn, first_name, last_name, role')
    .eq('user_id', user.id)
    .maybeSingle()

  const agencyId = agencyRow?.id ?? brokerRow?.agency_id
  if (!agencyId) return { error: 'No agency found' }

  let agencyDetails = agencyRow
  if (!agencyDetails) {
    const { data } = await supabaseAdmin
      .from('agencies')
      .select('subscription_tier, is_beta')
      .eq('id', agencyId)
      .maybeSingle()
    agencyDetails = data as typeof agencyRow
  }

  const tier = agencyDetails?.subscription_tier ?? 'trial'
  const isBeta = agencyDetails?.is_beta ?? false
  const allowed = isBeta || tier === 'agency' || tier === 'enterprise'
  if (!allowed) {
    return { error: 'Aegis Lock requires an Agency or Enterprise subscription. Upgrade at Settings > Billing.' }
  }

  const brokerId = brokerRow?.id
  if (!brokerId) return { error: 'Broker record not found' }

  const brokerName = `${brokerRow.first_name ?? ''} ${brokerRow.last_name ?? ''}`.trim()
  const brokerNpn = brokerRow.npn ?? null
  const method: SignatureMethod = input.signatureMethod ?? 'email_link'

  const medicareIdHash = input.medicareId ? hashMedicareId(input.medicareId) : null

  const pdfBytes = await fillAORPDF({
    client_name: input.clientName,
    medicare_id: input.medicareId,
    broker_name: brokerName,
    broker_npn: brokerNpn ?? undefined,
    submission_date: new Date().toLocaleDateString('en-US'),
  })

  // Token only needed for link-based methods
  const needsToken = method === 'email_link' || method === 'sms_link'
  const token = needsToken ? randomBytes(32).toString('hex') : null
  const tokenExpiry = needsToken
    ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    : null

  const { data: submission, error: insertError } = await supabaseAdmin
    .from('aor_submissions')
    .insert({
      agency_id: agencyId,
      ghl_contact_id: input.ghlContactId,
      broker_id: brokerId,
      submitted_by: user.id,
      client_name: input.clientName,
      medicare_id_hash: medicareIdHash,
      client_email: input.clientEmail ?? null,
      client_phone: input.clientPhone ?? null,
      broker_name: brokerName,
      broker_npn: brokerNpn,
      carrier: input.carrier,
      carrier_fax: input.carrierFax ?? null,
      signature_method: method,
      status: 'prepared',
      client_signature_token: token,
      client_signature_token_expires_at: tokenExpiry,
    })
    .select('id')
    .single()

  if (insertError || !submission) return { error: insertError?.message ?? 'Insert failed' }

  const pdfPath = `${agencyId}/aor/${submission.id}/prepared.pdf`
  await saveToPHIVault(pdfBytes, pdfPath)

  await supabaseAdmin
    .from('aor_submissions')
    .update({ filled_pdf_path: pdfPath })
    .eq('id', submission.id)

  await supabaseAdmin
    .from('ghl_contacts')
    .update({ aor_status: 'pending', aor_submission_id: submission.id })
    .eq('ghl_contact_id', input.ghlContactId)
    .eq('agency_id', agencyId)

  await supabaseAdmin.from('audit_log').insert({
    agency_id: agencyId,
    user_id: user.id,
    action: 'AOR_CREATED',
    details: {
      submission_id: submission.id,
      client_name: input.clientName,
      carrier: input.carrier,
      signature_method: method,
    },
  })

  revalidatePath('/dashboard/aor')
  return { submissionId: submission.id }
}

// -- 2. Send AOR to Client -------------------------------------------------

export async function sendAORToClient(
  submissionId: string
): Promise<{ success?: boolean; pdfDownloadUrl?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const { data: sub, error } = await supabaseAdmin
    .from('aor_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !sub) return { error: 'Submission not found' }

  const method: SignatureMethod = (sub.signature_method as SignatureMethod) ?? 'email_link'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.aegissage.com'

  // -- Manual / In-person: skip link sending, return download URL ----------
  if (method === 'manual_upload' || method === 'in_person') {
    await supabaseAdmin
      .from('aor_submissions')
      .update({ status: 'client_sent', updated_at: new Date().toISOString() })
      .eq('id', submissionId)

    // Generate a short-lived signed URL for the broker to download the pre-filled PDF
    let pdfDownloadUrl: string | undefined
    if (sub.filled_pdf_path) {
      const { data: signedData } = await supabaseAdmin.storage
        .from('phi-vault')
        .createSignedUrl(sub.filled_pdf_path, 3600)
      pdfDownloadUrl = signedData?.signedUrl ?? undefined
    }

    await supabaseAdmin.from('audit_log').insert({
      agency_id: sub.agency_id,
      user_id: user.id,
      action: 'AOR_SENT_TO_CLIENT',
      details: {
        submission_id: submissionId,
        client_name: sub.client_name,
        method,
        note: 'broker_download_issued',
      },
    })

    revalidatePath('/dashboard/aor')
    return { success: true, pdfDownloadUrl }
  }

  // -- Link-based: email_link / sms_link -----------------------------------
  const token = sub.client_signature_token
  if (!token) return { error: 'No signature token -- recreate the submission' }

  const signUrl = `${appUrl}/sign/aor/${token}`
  const smsMessage =
    `Hi ${sub.client_name}, your broker ${sub.broker_name} has prepared your Medicare ` +
    `Appointment of Representative form. Please review and sign: ${signUrl} -- Link expires in 72 hours.`

  if (method === 'sms_link' || method === 'email_link') {
    // SMS (best-effort)
    if (method === 'sms_link' && sub.ghl_contact_id) {
      try { await sendGHLSMS(sub.agency_id, sub.ghl_contact_id, smsMessage) } catch { /* non-fatal */ }
    }

    // Email (best-effort)
    if (method === 'email_link' && sub.client_email) {
      try { await sendSignatureEmail(sub.client_email, sub.client_name, sub.broker_name, signUrl) } catch { /* non-fatal */ }
    }

    // If both are set, send both regardless of primary method
    if (method === 'email_link' && sub.client_phone) {
      try { await sendGHLSMS(sub.agency_id, sub.ghl_contact_id, smsMessage) } catch { /* non-fatal */ }
    }
  }

  await supabaseAdmin
    .from('aor_submissions')
    .update({ status: 'client_sent', updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  await supabaseAdmin.from('audit_log').insert({
    agency_id: sub.agency_id,
    user_id: user.id,
    action: 'AOR_SENT_TO_CLIENT',
    details: { submission_id: submissionId, client_name: sub.client_name, method },
  })

  revalidatePath('/dashboard/aor')
  return { success: true }
}

// -- 3. Client Sign AOR (PUBLIC -- no auth) --------------------------------

export async function clientSignAOR(
  token: string,
  signatureName: string
): Promise<{ success?: boolean; submissionId?: string; error?: string }> {
  const supabaseAdmin = createServiceClient()

  const { data: sub, error } = await supabaseAdmin
    .from('aor_submissions')
    .select('*')
    .eq('client_signature_token', token)
    .maybeSingle()

  if (error || !sub) return { error: 'Invalid or expired link' }

  const expiry = sub.client_signature_token_expires_at
    ? new Date(sub.client_signature_token_expires_at)
    : null
  if (!expiry || expiry < new Date()) {
    return { error: 'This signing link has expired. Please contact your broker for a new link.' }
  }

  if (sub.status !== 'client_sent' && sub.status !== 'prepared') {
    return { error: 'This document has already been signed.' }
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const nameMatch =
    normalize(signatureName).includes(normalize(sub.client_name).split(' ')[0]) ||
    normalize(sub.client_name).includes(normalize(signatureName).split(' ')[0])

  if (!nameMatch) {
    return { error: 'Name does not match records. Please type your full legal name as it appears on your Medicare card.' }
  }

  let pdfBytes: Uint8Array | null = null
  if (sub.filled_pdf_path) {
    const { data: fileData } = await supabaseAdmin.storage
      .from('phi-vault')
      .download(sub.filled_pdf_path)
    if (fileData) {
      const buf = await fileData.arrayBuffer()
      pdfBytes = await addSignatureToPDF(new Uint8Array(buf), signatureName, 'client')
    }
  }

  if (!pdfBytes) {
    const fresh = await fillAORPDF({
      client_name: sub.client_name,
      broker_name: sub.broker_name,
      broker_npn: sub.broker_npn ?? undefined,
    })
    pdfBytes = await addSignatureToPDF(fresh, signatureName, 'client')
  }

  const signedPath = `${sub.agency_id}/aor/${sub.id}/client_signed.pdf`
  await saveToPHIVault(pdfBytes, signedPath)

  await supabaseAdmin
    .from('aor_submissions')
    .update({
      status: 'client_signed',
      client_signed_at: new Date().toISOString(),
      client_signature_name: signatureName,
      client_signature_token: null,
      filled_pdf_path: signedPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  try {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    await createGHLTask(sub.agency_id, sub.ghl_contact_id, {
      title: `Client signed AOR -- your counter-signature needed for ${sub.client_name}`,
      dueDate: dueDate.toISOString(),
    })
  } catch { /* non-fatal */ }

  await supabaseAdmin.from('audit_log').insert({
    agency_id: sub.agency_id,
    user_id: null,
    action: 'AOR_CLIENT_SIGNED',
    details: { submission_id: sub.id, client_name: sub.client_name, signature_name: signatureName },
  })

  notifyAORSigned(sub.id).catch(() => {})

  return { success: true, submissionId: sub.id }
}

// -- 4. Upload Signed AOR (manual / in-person) -----------------------------

export async function uploadSignedAOR(
  submissionId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }
  if (!file.name.toLowerCase().endsWith('.pdf')) return { error: 'Only PDF files are accepted' }

  const { data: sub, error } = await supabaseAdmin
    .from('aor_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !sub) return { error: 'Submission not found' }

  // Auth: must be assigned broker or principal
  const { data: brokerRow } = await supabase
    .from('brokers')
    .select('id, agency_id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAssignedBroker = brokerRow?.id === sub.broker_id
  const { data: agencyOwner } = await supabase
    .from('agencies')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  const isPrincipal = isAssignedBroker || (brokerRow?.agency_id === sub.agency_id) || !!agencyOwner

  if (!isPrincipal) return { error: 'Not authorized to upload for this submission' }

  const buf = await file.arrayBuffer()
  const pdfBytes = new Uint8Array(buf)

  const uploadedPath = `${sub.agency_id}/aor/${sub.id}/signed.pdf`
  await saveToPHIVault(pdfBytes, uploadedPath)

  // Mark as client_signed with manual note
  await supabaseAdmin
    .from('aor_submissions')
    .update({
      status: 'client_signed',
      client_signed_at: new Date().toISOString(),
      client_signature_name: sub.client_name,
      filled_pdf_path: uploadedPath,
      notes: 'Signature collected via manual upload',
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  await supabaseAdmin.from('audit_log').insert({
    agency_id: sub.agency_id,
    user_id: user.id,
    action: 'AOR_CLIENT_SIGNED',
    details: { submission_id: sub.id, client_name: sub.client_name, method: 'manual_upload' },
  })

  // Auto-trigger broker sign + fax
  const brokerSigName = `${brokerRow?.first_name ?? ''} ${brokerRow?.last_name ?? ''}`.trim()

  let finalPdfBytes: Uint8Array
  try {
    finalPdfBytes = await addSignatureToPDF(pdfBytes, brokerSigName, 'broker')
  } catch {
    finalPdfBytes = pdfBytes
  }

  const finalPath = `${sub.agency_id}/aor/${sub.id}/final_signed.pdf`
  await saveToPHIVault(finalPdfBytes, finalPath)

  let faxResult: import('@/lib/vcc/fax-dispatcher').FaxResult = { success: false, error: 'no_fax_number' }
  if (sub.carrier_fax) {
    faxResult = await sendFax(
      finalPdfBytes,
      sub.carrier_fax,
      `CMS-1696 AOR -- ${sub.client_name} -- ${sub.broker_npn ?? 'no-npn'}`
    )
  }

  await supabaseAdmin
    .from('aor_submissions')
    .update({
      status: faxResult.success ? 'faxed' : 'broker_signed',
      broker_signed_at: new Date().toISOString(),
      broker_signature_name: brokerSigName,
      filled_pdf_path: finalPath,
      fax_status: faxResult.success ? 'sent' : 'pending',
      fax_confirmation_id: faxResult.confirmationId ?? null,
      fax_sent_at: faxResult.success ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  await supabaseAdmin
    .from('ghl_contacts')
    .update({ aor_status: 'locked' })
    .eq('ghl_contact_id', sub.ghl_contact_id)
    .eq('agency_id', sub.agency_id)

  try { await addGHLTag(sub.agency_id, sub.ghl_contact_id, ['AEGIS-LOCKED']) } catch { /* non-fatal */ }

  await supabaseAdmin.from('audit_log').insert({
    agency_id: sub.agency_id,
    user_id: user.id,
    action: 'AOR_FAXED',
    details: {
      submission_id: sub.id,
      method: 'manual_upload',
      fax_success: faxResult.success,
    },
  })

  revalidatePath('/dashboard/aor')
  revalidatePath('/dashboard/retention')
  return { success: true }
}

// -- 5. Broker Sign & Fax --------------------------------------------------

export async function brokerSignAndFax(
  submissionId: string
): Promise<{ success?: boolean; faxConfirmationId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const { data: sub, error } = await supabaseAdmin
    .from('aor_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !sub) return { error: 'Submission not found' }
  if (sub.status !== 'client_signed') return { error: `Cannot sign -- current status is "${sub.status}"` }

  const { data: brokerRow } = await supabase
    .from('brokers')
    .select('id, agency_id, first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAssignedBroker = brokerRow?.id === sub.broker_id
  const isPrincipal = brokerRow?.agency_id === sub.agency_id &&
    (await supabase.from('agencies').select('id').eq('owner_id', user.id).maybeSingle()).data != null

  if (!isAssignedBroker && !isPrincipal) return { error: 'Not authorized to sign this submission' }

  const brokerSigName = `${brokerRow?.first_name ?? ''} ${brokerRow?.last_name ?? ''}`.trim()

  let pdfBytes: Uint8Array | null = null
  if (sub.filled_pdf_path) {
    const { data: fileData } = await supabaseAdmin.storage
      .from('phi-vault')
      .download(sub.filled_pdf_path)
    if (fileData) {
      const buf = await fileData.arrayBuffer()
      pdfBytes = await addSignatureToPDF(new Uint8Array(buf), brokerSigName, 'broker')
    }
  }

  if (!pdfBytes) return { error: 'Could not load signed PDF' }

  const finalPath = `${sub.agency_id}/aor/${sub.id}/final_signed.pdf`
  await saveToPHIVault(pdfBytes, finalPath)

  await supabaseAdmin
    .from('aor_submissions')
    .update({
      status: 'broker_signed',
      broker_signed_at: new Date().toISOString(),
      broker_signature_name: brokerSigName,
      filled_pdf_path: finalPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  let faxResult: import('@/lib/vcc/fax-dispatcher').FaxResult = { success: false, error: 'no_fax_number' }
  if (sub.carrier_fax) {
    faxResult = await sendFax(pdfBytes, sub.carrier_fax, `CMS-1696 AOR -- ${sub.client_name} -- ${sub.broker_npn ?? 'no-npn'}`)
  }

  const newStatus = faxResult.success ? 'faxed' : 'broker_signed'

  await supabaseAdmin
    .from('aor_submissions')
    .update({
      status: newStatus,
      fax_status: faxResult.success ? 'sent' : 'pending',
      fax_confirmation_id: faxResult.confirmationId ?? null,
      fax_sent_at: faxResult.success ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  await supabaseAdmin
    .from('ghl_contacts')
    .update({ aor_status: 'locked' })
    .eq('ghl_contact_id', sub.ghl_contact_id)
    .eq('agency_id', sub.agency_id)

  try { await addGHLTag(sub.agency_id, sub.ghl_contact_id, ['AEGIS-LOCKED']) } catch { /* non-fatal */ }

  await supabaseAdmin.from('audit_log').insert({
    agency_id: sub.agency_id,
    user_id: user.id,
    action: 'AOR_FAXED',
    details: {
      submission_id: sub.id,
      client_name: sub.client_name,
      fax_success: faxResult.success,
      fax_confirmation_id: faxResult.confirmationId ?? null,
    },
  })

  revalidatePath('/dashboard/aor')
  revalidatePath('/dashboard/retention')
  return { success: true, faxConfirmationId: faxResult.confirmationId }
}

// -- 6. Get Signed PDF URL (for broker download) ---------------------------

export async function getAORPDFUrl(
  submissionId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const { data: sub } = await supabaseAdmin
    .from('aor_submissions')
    .select('filled_pdf_path, agency_id, broker_id')
    .eq('id', submissionId)
    .single()

  if (!sub?.filled_pdf_path) return { error: 'No PDF on file' }

  const { data: signedData, error } = await supabaseAdmin.storage
    .from('phi-vault')
    .createSignedUrl(sub.filled_pdf_path, 3600)

  if (error || !signedData) return { error: 'Could not generate download URL' }
  return { url: signedData.signedUrl }
}

// -- 7. Get AORs for Agency ------------------------------------------------

export async function getAORsForAgency(filterBrokerId?: string): Promise<{
  submissions: AORSubmission[]
  stats: { total: number; pending: number; locked: number; expired: number }
  protectionRate: number
  totalContacts: number
  lockedContacts: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const { data: agencyRow } = await supabase
    .from('agencies').select('id').eq('owner_id', user.id).maybeSingle()
  const { data: brokerRow } = await supabase
    .from('brokers').select('agency_id').eq('user_id', user.id).maybeSingle()

  const agencyId = agencyRow?.id ?? brokerRow?.agency_id
  if (!agencyId) return {
    submissions: [],
    stats: { total: 0, pending: 0, locked: 0, expired: 0 },
    protectionRate: 0, totalContacts: 0, lockedContacts: 0,
  }

  let subsQuery = supabaseAdmin
    .from('aor_submissions')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (filterBrokerId) subsQuery = subsQuery.eq('broker_id', filterBrokerId)

  const [subResult, statsResult] = await Promise.all([
    subsQuery,
    supabaseAdmin
      .from('agency_protection_stats')
      .select('total_contacts, locked_contacts, protection_rate')
      .eq('agency_id', agencyId)
      .maybeSingle(),
  ])

  const submissions = (subResult.data ?? []) as AORSubmission[]
  const pStats = statsResult.data

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => ['prepared', 'client_sent', 'client_signed', 'broker_signed'].includes(s.status)).length,
    locked: submissions.filter(s => s.status === 'faxed' || s.status === 'confirmed').length,
    expired: submissions.filter(s => s.status === 'expired').length,
  }

  return {
    submissions,
    stats,
    protectionRate: Number(pStats?.protection_rate ?? 0),
    totalContacts: Number(pStats?.total_contacts ?? 0),
    lockedContacts: Number(pStats?.locked_contacts ?? 0),
  }
}
