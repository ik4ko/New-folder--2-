/**
 * Local Humana login test — uses playwright-extra + stealth plugin.
 *
 * Prerequisites (run once):
 *   npx playwright install chromium
 *
 * Usage:
 *   HUMANA_USERNAME=you@email.com HUMANA_PASSWORD=yourpw npm run test:humana
 *
 * Calls doLogin() and downloadRoster() directly — does NOT invoke
 * @sparticuz/chromium (Linux binary), so safe to run on Windows/Mac.
 */

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { HumanaScraper } from '../src/lib/detection/carrier-scrapers/humana.js'

chromium.use(StealthPlugin())

const USERNAME = process.env.HUMANA_USERNAME ?? ''
const PASSWORD = process.env.HUMANA_PASSWORD ?? ''

if (!USERNAME || !PASSWORD) {
  console.error('Error: set HUMANA_USERNAME and HUMANA_PASSWORD env vars before running.')
  console.error('  Example: HUMANA_USERNAME=you@email.com HUMANA_PASSWORD=yourpw npm run test:humana')
  process.exit(1)
}

async function main() {
  console.log('Launching Chromium (playwright-extra + stealth)...')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()
    const scraper = new HumanaScraper()

    console.log('\n── Step 1: doLogin ──────────────────────────────')
    const loggedIn = await scraper.doLogin(page, USERNAME, PASSWORD)
    console.log('Login result :', loggedIn)
    console.log('Current URL  :', page.url())
    console.log('Page title   :', await page.title())

    if (!loggedIn) {
      console.log('\nLogin failed. Saving screenshot to scripts/debug-login-failed.png ...')
      await page.screenshot({ path: 'scripts/debug-login-failed.png', fullPage: true })
      console.log('Open the screenshot to see where the browser ended up.')
      console.log('Then update selectors in src/lib/detection/carrier-scrapers/humana.ts')
      console.log('\nKeeping browser open for 60 seconds — inspect manually if needed...')
      await new Promise(r => setTimeout(r, 60_000))
      return
    }

    console.log('\n── Step 2: downloadRoster ───────────────────────')
    try {
      const rows = await scraper.downloadRoster(page)
      console.log('Roster rows  :', rows.length)
      if (rows.length > 0) {
        console.log('First row    :', JSON.stringify(rows[0], null, 2))
        console.log('Last row     :', JSON.stringify(rows[rows.length - 1], null, 2))
      } else {
        console.log('Warning: download succeeded but returned 0 rows.')
        console.log('Check that "All Columns" CSV parsed correctly.')
        await page.screenshot({ path: 'scripts/debug-roster-empty.png', fullPage: true })
        console.log('Screenshot saved to scripts/debug-roster-empty.png')
      }
    } catch (err) {
      console.error('\nRoster download failed:', err)
      await page.screenshot({ path: 'scripts/debug-roster-error.png', fullPage: true })
      console.log('Screenshot saved to scripts/debug-roster-error.png')
    }

    console.log('\nKeeping browser open for 30 seconds...')
    await new Promise(r => setTimeout(r, 30_000))
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('\nUnhandled error:', err)
  process.exit(1)
})
