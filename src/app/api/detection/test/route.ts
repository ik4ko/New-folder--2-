import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptCredential } from '@/lib/crypto-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, agency_id').eq('user_id', user.id).maybeSingle(),
  ])

  const agencyId = agency?.id ?? brokerRow?.agency_id
  if (!agencyId) return NextResponse.json({ error: 'No agency found' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { carrier?: string }
  const { carrier } = body
  if (!carrier) return NextResponse.json({ error: 'carrier is required' }, { status: 400 })

  const supabaseAdmin = createServiceClient()

  // Fetch stored credential — brokers see own, principals see all
  const brokerId = brokerRow?.id ?? null
  let credQuery = supabaseAdmin
    .from('carrier_logins')
    .select('username, password_encrypted')
    .eq('agency_id', agencyId)
    .or(`carrier.eq.${carrier},carrier.like.${carrier}_%`)

  if (brokerId !== null) {
    credQuery = credQuery.eq('broker_id', brokerId) as typeof credQuery
  }

  const { data: cred } = await credQuery.maybeSingle()
  if (!cred) return NextResponse.json({ error: 'No saved credentials for this carrier' }, { status: 404 })

  let password: string
  try {
    password = decryptCredential(cred.password_encrypted)
  } catch {
    return NextResponse.json({ error: 'Credential decryption failed' }, { status: 500 })
  }

  // Lazy-load heavy modules — only run in Node.js runtime
  const chromium = (await import('@sparticuz/chromium')).default
  const { chromium: playwrightChromium } = await import('playwright-core')

  const { HumanaScraper } = await import('@/lib/detection/carrier-scrapers/humana')
  const { UHCScraper } = await import('@/lib/detection/carrier-scrapers/uhc')

  const base = carrier.split('_')[0]
  const scraperMap: Record<string, { doLogin: (p: any, u: string, pw: string) => Promise<boolean> }> = {
    humana: new HumanaScraper(),
    uhc: new UHCScraper(),
  }
  const scraper = scraperMap[base]
  if (!scraper) return NextResponse.json({ error: `No scraper available for carrier: ${base}` }, { status: 400 })

  const executablePath = await chromium.executablePath()
  const browser = await playwrightChromium.launch({
    args: chromium.args,
    executablePath,
    headless: chromium.headless,
  })

  try {
    const ctx = await browser.newContext({
      viewport: chromium.defaultViewport ?? { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    const loggedIn = await scraper.doLogin(page, cred.username, password)

    const screenshot = await page.screenshot({ type: 'png' })
    const pageTitle = await page.title()
    const currentUrl = page.url()
    await browser.close()

    // Upload screenshot to detection-logs bucket
    const path = `${agencyId}/${carrier}/${Date.now()}.png`
    await supabaseAdmin.storage
      .from('detection-logs')
      .upload(path, screenshot, { contentType: 'image/png', upsert: false })

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('detection-logs')
      .createSignedUrl(path, 3600)

    return NextResponse.json({
      success: loggedIn,
      screenshot_url: signedUrlData?.signedUrl ?? null,
      page_title: pageTitle,
      current_url: currentUrl,
    })
  } catch (err: any) {
    await browser.close().catch(() => {})
    return NextResponse.json({
      success: false,
      error: err?.message ?? 'Unknown error',
    })
  }
}
