# Email DNS Setup — aegissage.com

Configure these DNS records at your domain registrar to ensure Gmail
delivers AegisSage emails to the Primary inbox rather than Spam or
Promotions.

---

## 1 · Verify your domain in Resend

1. Log in to [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Enter `aegissage.com` and click **Add**
3. Resend will show a list of DNS records to add. Keep this tab open —
   you will copy the DKIM values from here in Step 3 below.
4. After adding all records, click **Verify DNS Records** inside Resend.
   Propagation can take up to 48 hours but usually completes within minutes.

---

## 2 · SPF record

Authorises Amazon SES (Resend's sending infrastructure) to send on
behalf of `aegissage.com`.

| Field | Value |
|-------|-------|
| **Type** | `TXT` |
| **Host / Name** | `@` (or `aegissage.com`) |
| **Value** | `v=spf1 include:amazonses.com ~all` |
| **TTL** | `3600` (or "Auto") |

> If you already have an SPF record, add `include:amazonses.com` to the
> existing `v=spf1 … ~all` value rather than creating a second TXT record.

---

## 3 · DKIM records

DKIM records prove that emails have not been tampered with in transit.
Resend generates unique CNAME values per domain.

**Get your exact values:**
1. Resend dashboard → **Domains** → `aegissage.com` → **DNS Records**
2. You will see two or three CNAME records like:

| Type | Host | Value |
|------|------|-------|
| `CNAME` | `resend1._domainkey.aegissage.com` | `resend1.dkim.resend.com` |
| `CNAME` | `resend2._domainkey.aegissage.com` | `resend2.dkim.resend.com` |

> The exact subdomain names (`resend1`, `resend2`) and target values are
> unique to your Resend account. Copy them directly from the dashboard —
> do not guess or reuse values from another domain.

Add each CNAME record at your registrar with TTL `3600`.

---

## 4 · DMARC record

DMARC tells receiving mail servers what to do with emails that fail SPF
or DKIM, and where to send aggregate reports.

| Field | Value |
|-------|-------|
| **Type** | `TXT` |
| **Host / Name** | `_dmarc` (resolves to `_dmarc.aegissage.com`) |
| **Value** | `v=DMARC1; p=none; rua=mailto:dmarc@aegissage.com` |
| **TTL** | `3600` |

`p=none` means monitor-only mode — emails are not rejected or quarantined
while you verify delivery. Once you have reviewed reports and confirmed
clean sending, upgrade to `p=quarantine` or `p=reject`.

---

## 5 · Step-by-step checklist

- [ ] Log in to Resend, go to **Domains**, add `aegissage.com`
- [ ] Copy the SPF value and add a `TXT` record at `@` at your registrar
- [ ] Copy the DKIM CNAME records from Resend and add them at your registrar
- [ ] Add the DMARC `TXT` record at `_dmarc`
- [ ] Wait 5–30 minutes, then click **Verify DNS Records** in Resend
- [ ] Send a test email to a Gmail address and confirm it lands in Primary
- [ ] Monitor `dmarc@aegissage.com` for aggregate DMARC reports

---

## 6 · Registrar-specific notes

- **Cloudflare** — Set CNAME proxy status to **DNS only** (grey cloud) for
  the DKIM CNAMEs; proxied CNAMEs break DKIM verification.
- **GoDaddy** — Enter `_dmarc` in the Host field (GoDaddy appends the
  domain automatically).
- **Namecheap** — Use `@` for the SPF host; enter `_dmarc.aegissage.com`
  as the full host for the DMARC record.
- **Google Domains / Squarespace DNS** — TXT and CNAME records accept the
  same format as above.

---

## 7 · Troubleshooting

| Symptom | Check |
|---------|-------|
| Resend shows "Unverified" after 1 hour | DNS propagation — wait another hour and retry |
| Emails land in Spam despite valid SPF/DKIM | DMARC `p=none` is set — check reports for misalignment |
| DKIM CNAME flagged as "proxied" in Cloudflare | Switch to DNS-only (grey cloud) for those records |
| Second SPF record rejected | Merge `include:amazonses.com` into your existing SPF record |
