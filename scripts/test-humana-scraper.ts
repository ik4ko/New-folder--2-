/**
 * Local test script for the Humana scraper.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/test-humana-scraper.ts
 *
 * NOTE: @sparticuz/chromium downloads a Linux x64 binary — it does NOT work
 * on Windows locally. This script uses playwright-core's own bundled Chromium
 * for local runs. First install it: npx playwright install chromium
 *
 * Set credentials in env or replace the placeholders below.
 */

import { HumanaScraper } from '../src/lib/detection/carrier-scrapers/humana'
import { chromium as pw } from 'playwright-core'

const USERNAME = process.env.HUMANA_USERNAME ?? 'YOUR_HUMANA_USERNAME'
const PASSWORD = process.env.HUMANA_PASSWORD ?? 'YOUR_HUMANA_PASSWORD'

async function main() {
  const scraper = new HumanaScraper()

  const browser = await pw.launch({
    headless: false, // visible — so you can watch and debug
    slowMo: 200,     // slow down actions for readability
  })

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()

    console.log('Testing Humana login...')
    const loggedIn = await scraper.doLogin(page, USERNAME, PASSWORD)

    console.log('Login result:', loggedIn)
    console.log('Current URL :', page.url())
    console.log('Page title  :', await page.title())

    if (loggedIn) {
      console.log('\nAttempting roster download...')
      const rows = await scraper.downloadRoster(page)
      console.log('Roster rows :', rows.length)
      if (rows.length > 0) {
        console.log('First row   :', JSON.stringify(rows[0], null, 2))
        console.log('Last row    :', JSON.stringify(rows[rows.length - 1], null, 2))
      }
    } else {
      console.log('\nLogin failed. Taking screenshot for debugging...')
      await page.screenshot({ path: 'scripts/debug-login-failed.png' })
      console.log('Screenshot saved to scripts/debug-login-failed.png')
    }
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
