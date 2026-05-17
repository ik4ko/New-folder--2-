// AegisSage email templates — returns { subject, html } for each notification type

const PRIMARY = '#6366f1'
const BG = '#0f172a'
const CARD_BG = '#1e293b'
const TEXT = '#e2e8f0'
const MUTED = '#94a3b8'
const BORDER = '#334155'

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Arial,sans-serif;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:0 0 28px 0;">
            <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:${PRIMARY};">AegisSage</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;padding:36px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 0 0 0;text-align:center;">
            <p style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.1em;margin:0;">
              Not connected with or endorsed by the U.S. government or the federal Medicare program.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function badge(text: string, color = PRIMARY): string {
  return `<span style="display:inline-block;background:${color}22;color:${color};font-size:10px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:999px;border:1px solid ${color}44;">${text}</span>`
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;color:${TEXT};">${text}</h1>`
}

function p(text: string, muted = false): string {
  return `<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${muted ? MUTED : TEXT};">${text}</p>`
}

function cta(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:${PRIMARY};color:#fff;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;border-radius:10px;text-decoration:none;">${label}</a>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};width:40%;">${label}</td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;color:${TEXT};">${value}</td>
  </tr>`
}

// ── 1. Switch Alert ────────────────────────────────────────────────────────

export interface SwitchAlertEmailParams {
  brokerName: string
  clientName: string
  carrier: string
  alertType: string
  dashboardUrl: string
}

export function switchAlertEmail(p: SwitchAlertEmailParams): { subject: string; html: string } {
  const alertLabel = p.alertType === 'missing_from_roster' ? 'Missing From Roster' : 'New Enrollment'
  const subject = `[AegisSage] Alert: ${p.clientName} — ${alertLabel}`

  const body = `
    ${badge(alertLabel, '#f59e0b')}
    <div style="margin-top:20px;">${h1('Churn Alert')}</div>
    ${p(`Hi ${p.brokerName},`, false)}
    ${p(`A plan change event was detected for one of your clients. Review and take action.`, true)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
      ${row('Client', p.clientName)}
      ${row('Carrier', p.carrier)}
      ${row('Alert Type', alertLabel)}
    </table>
    ${cta('View in Dashboard', p.dashboardUrl)}
  `

  return { subject, html: base(subject, body) }
}

// ── 2. VCC Deadline ────────────────────────────────────────────────────────

export interface VCCDeadlineEmailParams {
  brokerName: string
  clientName: string
  carrier: string
  daysRemaining: number
  dashboardUrl: string
}

export function vccDeadlineEmail(p: VCCDeadlineEmailParams): { subject: string; html: string } {
  const urgency = p.daysRemaining <= 2 ? '#ef4444' : p.daysRemaining <= 5 ? '#f59e0b' : '#6366f1'
  const subject = `[AegisSage] VCC Deadline: ${p.clientName} — ${p.daysRemaining} day${p.daysRemaining === 1 ? '' : 's'} left`

  const body = `
    ${badge(`${p.daysRemaining} Days Remaining`, urgency)}
    <div style="margin-top:20px;">${h1('VCC Form Deadline')}</div>
    ${p(`Hi ${p.brokerName},`, false)}
    ${p(`A carrier form for your client is scheduled to be faxed soon. Confirm all details are correct.`, true)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
      ${row('Client', p.clientName)}
      ${row('Carrier', p.carrier)}
      ${row('Days Until Send', String(p.daysRemaining))}
    </table>
    ${cta('Review VCC Form', p.dashboardUrl)}
  `

  return { subject, html: base(subject, body) }
}

// ── 3. AOR Signed ─────────────────────────────────────────────────────────

export interface AORSignedEmailParams {
  brokerName: string
  clientName: string
  signatureMethod: string
  dashboardUrl: string
}

export function aorSignedEmail(p: AORSignedEmailParams): { subject: string; html: string } {
  const subject = `[AegisSage] ${p.clientName} signed their AOR — counter-signature needed`

  const body = `
    ${badge('Action Required', '#10b981')}
    <div style="margin-top:20px;">${h1('AOR Signed by Client')}</div>
    ${p(`Hi ${p.brokerName},`, false)}
    ${p(`Your client has completed their electronic signature on the CMS-1696 AOR. Your counter-signature is now needed to finalize.`, true)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
      ${row('Client', p.clientName)}
      ${row('Signature Method', p.signatureMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
    </table>
    ${cta('Sign & Fax Now', p.dashboardUrl)}
  `

  return { subject, html: base(subject, body) }
}

// ── 4. Team Invite ────────────────────────────────────────────────────────

export interface TeamInviteEmailParams {
  inviterName: string
  agencyName: string
  role: string
  inviteUrl: string
  expiresIn: string
}

export function teamInviteEmail(p: TeamInviteEmailParams): { subject: string; html: string } {
  const roleLabel = p.role === 'agency_admin' ? 'Manager' : p.role === 'customer_service' ? 'Customer Service' : 'Broker'
  const subject = `You've been invited to join ${p.agencyName} on AegisSage`

  const body = `
    ${badge('Team Invitation')}
    <div style="margin-top:20px;">${h1('You\'re Invited')}</div>
    ${p(`<strong>${p.inviterName}</strong> has invited you to join <strong>${p.agencyName}</strong> as a ${roleLabel}.`, false)}
    ${p(`AegisSage is a Medicare retention and compliance platform. Your invite expires in ${p.expiresIn}.`, true)}
    ${cta('Accept Invitation', p.inviteUrl)}
    <p style="margin-top:20px;font-size:11px;color:${MUTED};">If you weren't expecting this invite, you can safely ignore this email.</p>
  `

  return { subject, html: base(subject, body) }
}

// ── 5. Weekly Digest ──────────────────────────────────────────────────────

export interface WeeklyDigestEmailParams {
  brokerName: string
  agencyName: string
  openAlerts: number
  vccPending: number
  aorPending: number
  clientsAtRisk: number
  dashboardUrl: string
}

export function weeklyDigestEmail(p: WeeklyDigestEmailParams): { subject: string; html: string } {
  const subject = `[AegisSage] Weekly Digest — ${p.agencyName}`

  const statBlock = (label: string, value: number, color = TEXT) =>
    `<td style="text-align:center;padding:16px 20px;background:${BG};border-radius:10px;border:1px solid ${BORDER};">
      <div style="font-size:28px;font-weight:900;color:${color};">${value}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};margin-top:4px;">${label}</div>
    </td>`

  const body = `
    ${badge('Weekly Digest')}
    <div style="margin-top:20px;">${h1('Your Week in Review')}</div>
    ${p(`Hi ${p.brokerName}, here's your AegisSage summary for the week.`, false)}
    <table width="100%" cellspacing="8" style="margin:20px 0 28px;border-collapse:separate;border-spacing:8px;">
      <tr>
        ${statBlock('Open Alerts', p.openAlerts, p.openAlerts > 0 ? '#f59e0b' : TEXT)}
        ${statBlock('VCC Pending', p.vccPending, p.vccPending > 0 ? '#6366f1' : TEXT)}
        ${statBlock('AOR Pending', p.aorPending, p.aorPending > 0 ? '#6366f1' : TEXT)}
        ${statBlock('At Risk', p.clientsAtRisk, p.clientsAtRisk > 0 ? '#ef4444' : TEXT)}
      </tr>
    </table>
    ${cta('Open Dashboard', p.dashboardUrl)}
  `

  return { subject, html: base(subject, body) }
}
